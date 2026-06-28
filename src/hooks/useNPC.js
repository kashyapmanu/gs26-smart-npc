import { useState, useCallback, useRef, useEffect } from 'react';

// Offline fallback dialogues matching the current world state
const FALLBACK_DIALOGUES = {
  lilly: {
    fireActive: [
      { text: "Help me! The smoke is too thick... I'm trapped near the window!", emotion: "sad" },
      { text: "Please, hurry! The ceiling is starting to crumble!", emotion: "sad" }
    ],
    rescued: [
      { text: "Thank you so much! You saved my life... I'll never forget your bravery!", emotion: "happy" },
      { text: "I'm still a bit shaken up, but I'm just so glad to be safe. You are a true hero!", emotion: "happy" }
    ]
  },
  elric: {
    fireActive: [
      { text: "Did you see the smoke in the square? Someone needs to do something! I must tend to my customers, but my heart is heavy.", emotion: "sad" }
    ],
    rescued: [
      { text: "Ah! The hero of the hour! Lilly is safe thanks to you. A legendary feat! Here, eat this hearty stew, it's on the house!", emotion: "happy", grantMeal: true }
    ],
    ignored: [
      { text: "Tragic... absolutely tragic. Lilly was badly hurt, and the bakery is in ruins. A dark day for our village. If you want a hot stew, it will be 10 gold.", emotion: "sad", chargeMeal: true }
    ]
  },
  barnaby: {
    fireActive: [
      { text: "A fire? Oh dear! I'd help, but... my back, you see? Yes, my back has been acting up since the harvest. Let me know how it goes!", emotion: "neutral" }
    ],
    rescued: [
      { text: "Incredible! I saw you run right into the blaze! I'm already spreading the word to the other districts. You're a legend!", emotion: "happy" }
    ],
    ignored: [
      { text: "I saw you walk right past the screams, traveler. Pretty cold-blooded if you ask me. Don't expect any warm greetings around here.", emotion: "angry" }
    ]
  },
  guinevere: {
    fireActive: [
      { text: "A burning bakery. How dramatic. Go play the martyr if it pleases you, but don't track soot and ashes into the tavern.", emotion: "neutral" }
    ],
    rescued: [
      { text: "Well, well. A genuine display of self-preservation bypass. Bold, but rather foolish. I suppose you expect this town to build a statue in your honor?", emotion: "neutral" }
    ],
    ignored: [
      { text: "Ah, the practical traveler. You watched it burn, didn't you? Honestly, I don't blame you. Heroism is just a shortcut to an early grave.", emotion: "happy" }
    ]
  }
};

const getApiEndpoint = () => {
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return '/api/v1/chat/completions';
  }
  return 'https://api.meshapi.ai/v1/chat/completions';
};

function getOfflineDialogue(npcId, fireActive, lillyRescued, dialogLength) {
  const npcFallbacks = FALLBACK_DIALOGUES[npcId];
  if (!npcFallbacks) return { text: "...", emotion: "neutral" };

  if (npcId === 'lilly') {
    if (fireActive) {
      const idx = dialogLength % npcFallbacks.fireActive.length;
      return npcFallbacks.fireActive[idx];
    } else {
      const idx = dialogLength % npcFallbacks.rescued.length;
      return npcFallbacks.rescued[idx];
    }
  }

  // Tavern NPCs
  if (fireActive) {
    return npcFallbacks.fireActive[0];
  } else if (lillyRescued) {
    return npcFallbacks.rescued[0];
  } else {
    return npcFallbacks.ignored[0];
  }
}

function getSystemPrompt(npcId, fireActive, lillyRescued, reputation, playerGold, hasMeal) {
  const npcProfiles = {
    lilly: {
      name: "Lilly Baker",
      role: "the Baker's Daughter",
      personality: "Grateful, emotional, sweet, slightly traumatized by the fire. Speak in a gentle, relieved, or desperate voice depending on the fire status.",
      notes: "She is a young woman who was trapped in the burning bakery."
    },
    elric: {
      name: "Elric",
      role: "the Tavern Keeper & Hotel Owner",
      personality: "Jovial, business-oriented, but values community. He has a booming, friendly voice, but becomes somber when discussing tragedy.",
      notes: "If Lilly was saved, Elric is so grateful he gives a free meal (sets grantMeal: true). If ignored/burned, he charges 10 gold for the meal (sets chargeMeal: true)."
    },
    barnaby: {
      name: "Barnaby",
      role: "the Town Gossip / Tavern Drunkard",
      personality: "Exaggerated, highly talkative, loves juice and rumors, easily excited or disgusted. Speaks with slurs and expressive gestures.",
      notes: "If Lilly was saved, he spreads rumors calling the player a great hero. If ignored, he gossips about the player being a coward."
    },
    guinevere: {
      name: "Lady Guinevere",
      role: "a Cynical Noblewoman visiting the tavern",
      personality: "Sarcastic, cold, aristocratic, highly intelligent, and mockingly realistic. Speaks with dry wit and sophistication.",
      notes: "She scoffs at traditional heroism as foolishness, but finds ignoring the fire to be a practical, if selfish, choice."
    }
  };

  const p = npcProfiles[npcId] || { name: npcId, role: "villager", personality: "neutral", notes: "" };
  
  let eventSummary = "";
  if (fireActive) {
    eventSummary = "A house is currently BURNING DOWN in the Town Square! Lilly is trapped inside. The player has NOT saved her yet.";
  } else if (lillyRescued) {
    eventSummary = "The house fire was put out, and the player bravely SAVED Lilly from the burning building. The town is celebrating.";
  } else {
    eventSummary = "The house burned to the ground and Lilly was injured because the player IGNORED the fire and came straight to the tavern. The town is mourning and angry.";
  }

  const mealState = `Player gold: ${playerGold}g. Has eaten: ${hasMeal ? 'Yes' : 'No'}.`;

  return `You are playing the role of ${p.name}, who is ${p.role} in a medieval town.
Personality: ${p.personality}
Background: ${p.notes}

CURRENT GAME WORLD STATE:
- ${eventSummary}
- ${mealState}
- Player Reputation: ${reputation} (-100 to 100)

CONVERSATION CONTEXT:
- Keep responses short: 1 to 2 sentences max.
- Always stay in character. Do not speak as an AI. Use medieval/fantasy phrasing suitable for your role.
- React directly to the player's choices and current inputs.

CRITICAL INSTRUCTION:
You MUST respond with a valid JSON object. Do not include markdown code block formatting (such as \`\`\`json) or any pre/post text. Return ONLY the JSON object.
JSON schema:
{
  "text": "Your spoken dialogue response in character",
  "emotion": "happy" | "sad" | "neutral" | "angry",
  "grantMeal": true | false, // (Elric ONLY): Set true only if Lilly was rescued and you are giving the player a free meal.
  "chargeMeal": true | false, // (Elric ONLY): Set true only if the player wants to buy a meal and must pay 10 gold.
  "reputationChange": number // optional integer between -20 and 20 indicating how this interaction affects the player's reputation.
}`;
}

export function useNPC({
  apiKey,
  model,
  reputation,
  setReputation,
  playerGold,
  setPlayerGold,
  hasMeal,
  setHasMeal,
  setHasPaidForMeal,
  fireActive,
  lillyRescued
}) {
  const [dialogHistories, setDialogHistories] = useState({
    lilly: [],
    elric: [],
    barnaby: [],
    guinevere: []
  });

  const dialogHistoriesRef = useRef(dialogHistories);
  useEffect(() => {
    dialogHistoriesRef.current = dialogHistories;
  }, [dialogHistories]);

  const clearHistories = useCallback(() => {
    setDialogHistories({
      lilly: [],
      elric: [],
      barnaby: [],
      guinevere: []
    });
  }, []);

  const clearNpcHistory = useCallback((npcId) => {
    setDialogHistories(prev => ({
      ...prev,
      [npcId]: []
    }));
  }, []);

  const generateResponse = useCallback(async (npcId, playerInput) => {
    const currentHistory = dialogHistoriesRef.current[npcId] || [];

    // 1. Check Offline fallback
    if (!apiKey || apiKey.trim() === '') {
      await new Promise(resolve => setTimeout(resolve, 600));
      const fallback = getOfflineDialogue(npcId, fireActive, lillyRescued, currentHistory.length);
      
      // Side effects for offline mode
      if (fallback.grantMeal && npcId === 'elric' && !hasMeal) {
        setHasMeal(true);
      }
      if (fallback.chargeMeal && npcId === 'elric' && !hasMeal && playerGold >= 10) {
        setPlayerGold(prev => prev - 10);
        setHasMeal(true);
        setHasPaidForMeal(true);
      }

      const isFirst = currentHistory.length === 0;
      setDialogHistories(prev => {
        const historyUpdate = [
          ...prev[npcId],
          { role: 'user', content: playerInput },
          { role: 'assistant', content: fallback.text }
        ];
        if (isFirst) {
          historyUpdate.push({ role: 'system', content: "[Gateway key missing. Running in offline fallback mode.]" });
        }
        return {
          ...prev,
          [npcId]: historyUpdate
        };
      });

      return fallback;
    }

    // 2. LLM Online Call
    const chatHistory = currentHistory.filter(h => h.role === 'user' || h.role === 'assistant');
    const messages = [
      { role: 'system', content: getSystemPrompt(npcId, fireActive, lillyRescued, reputation, playerGold, hasMeal) },
      ...chatHistory.slice(-6),
      { role: 'user', content: playerInput }
    ];

    try {
      const response = await fetch(getApiEndpoint(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          temperature: 0.75,
          max_tokens: 400,
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      const rawContent = data.choices[0].message.content.trim();
      
      let parsed;
      try {
        let cleanContent = rawContent;
        if (cleanContent.startsWith('```')) {
          cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/```$/, '');
        }
        parsed = JSON.parse(cleanContent);
      } catch (e) {
        console.warn("JSON parse failed. Raw response:", rawContent);
        
        // Regex recovery fallback for truncated or malformed JSON responses
        let text = "";
        const textMatch = rawContent.match(/"text"\s*:\s*"([^"]*)/);
        if (textMatch) {
          text = textMatch[1];
        } else {
          // If no "text" key is found, strip outer JSON structures to retrieve the clean raw text
          text = rawContent.replace(/[{}"\r\n\t]/g, '').replace(/^(text|emotion|grantMeal|chargeMeal|reputationChange)\s*:\s*/, '').trim();
        }

        let emotion = "neutral";
        const emotionMatch = rawContent.match(/"emotion"\s*:\s*"([^"]*)/);
        if (emotionMatch) {
          emotion = emotionMatch[1];
        }

        parsed = {
          text: text,
          emotion: emotion,
          grantMeal: false,
          chargeMeal: false,
          reputationChange: 0
        };
      }

      // Apply state side effects
      if (parsed.reputationChange) {
        setReputation(prev => Math.max(-100, Math.min(100, prev + parsed.reputationChange)));
      }

      if (parsed.grantMeal && npcId === 'elric' && !hasMeal) {
        setHasMeal(true);
      }

      if (parsed.chargeMeal && npcId === 'elric' && !hasMeal) {
        if (playerGold >= 10) {
          setPlayerGold(prev => prev - 10);
          setHasMeal(true);
          setHasPaidForMeal(true);
        } else {
          parsed.text = "You don't have enough gold! A hot stew costs 10 gold coin, traveler. Speak to me when you have funds.";
          parsed.emotion = "angry";
        }
      }

      setDialogHistories(prev => ({
        ...prev,
        [npcId]: [
          ...prev[npcId],
          { role: 'user', content: playerInput },
          { role: 'assistant', content: parsed.text }
        ]
      }));

      return parsed;

    } catch (error) {
      console.error("Error with Mesh API:", error);
      // Fallback on error
      const fallback = getOfflineDialogue(npcId, fireActive, lillyRescued, currentHistory.length);
      
      if (fallback.grantMeal && npcId === 'elric' && !hasMeal) {
        setHasMeal(true);
      }
      if (fallback.chargeMeal && npcId === 'elric' && !hasMeal && playerGold >= 10) {
        setPlayerGold(prev => prev - 10);
        setHasMeal(true);
        setHasPaidForMeal(true);
      }

      setDialogHistories(prev => ({
        ...prev,
        [npcId]: [
          ...prev[npcId],
          { role: 'user', content: playerInput },
          { role: 'assistant', content: fallback.text },
          { role: 'system', content: `[Mesh API Error: ${error.message}. Loaded offline fallback.]` }
        ]
      }));

      return {
        ...fallback,
        error: "Mesh API error. Loaded offline fallback."
      };
    }
  }, [apiKey, model, reputation, playerGold, hasMeal, fireActive, lillyRescued, setReputation, setPlayerGold, setHasMeal, setHasPaidForMeal]);

  const generateGossipBoard = useCallback(async () => {
    const baseRumors = [
      { 
        title: "Fire in Town Square", 
        body: fireActive 
          ? "Smoke bills from the old bakery! Bystanders look on with concern." 
          : (lillyRescued 
              ? "Lilly Baker was saved from the flames! A traveler rushed into the fire like a champion." 
              : "Tragedy. The old bakery burned to cinders. Lilly was hurt. Where were the guards? Where was the heroism?") 
      },
      { 
        title: "Tavern Buzz", 
        body: fireActive 
          ? "Tavern keeper Elric is preparing food, but worries about the square." 
          : (lillyRescued 
              ? "Elric Tavern Keeper is giving out free drinks and hot stews for the local savior!" 
              : "Elric is charging full price, complaining about the cost of living and the tragic town fire.") 
      },
      { 
        title: "Whispers", 
        body: fireActive 
          ? "Barnaby says he heard a crackle, but thought it was just his ears. Guinevere thinks it's a nuisance." 
          : (lillyRescued 
              ? "Barnaby is telling everyone who will listen. Guinevere is seen yawning, muttering about dramatic displays." 
              : "Barnaby is muttering about cowards. Guinevere is heard saying at least one person had the sense not to burn their own boots.") 
      }
    ];

    if (!apiKey || apiKey.trim() === '') {
      await new Promise(resolve => setTimeout(resolve, 800));
      return baseRumors;
    }

    let stateDescription = "";
    if (fireActive) {
      stateDescription = "The bakery is currently on fire. The town is panicked.";
    } else if (lillyRescued) {
      stateDescription = "The player successfully rescued Lilly Baker. The town is celebrating and praising the player.";
    } else {
      stateDescription = "The player ignored the bakery fire, letting it burn down and Lilly get hurt. The town is mourning and angry at the player.";
    }

    const prompt = `You are the Town Bulletin Board or rumor writer in a medieval fantasy setting.
Write 3 short rumor cards for the tavern's notice board summarizing the town's reaction to current events.

WORLD CONTEXT:
- ${stateDescription}
- Player Reputation: ${reputation}

INSTRUCTIONS:
- Generate exactly 3 rumor entries.
- Speak in a medieval gossip, news-sheet, or rumors tone.
- Return ONLY a JSON array containing objects with "title" and "body" keys. Do not include markdown code block formatting (such as \`\`\`json).

Example Schema:
[
  { "title": "Headline", "body": "Short rumor text (1-2 sentences)" },
  ...
]`;

    try {
      const response = await fetch(getApiEndpoint(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.8,
          max_tokens: 300,
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) throw new Error();

      const data = await response.json();
      let rawContent = data.choices[0].message.content.trim();
      if (rawContent.startsWith('```')) {
        rawContent = rawContent.replace(/^```json\s*/, '').replace(/```$/, '');
      }
      return JSON.parse(rawContent);
    } catch (error) {
      console.warn("Failed to generate custom board entries. Using defaults.");
      return baseRumors;
    }
  }, [apiKey, model, fireActive, lillyRescued, reputation]);

  return {
    dialogHistories,
    generateResponse,
    generateGossipBoard,
    clearHistories,
    clearNpcHistory
  };
}
