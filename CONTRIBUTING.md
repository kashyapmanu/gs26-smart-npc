# Contributing to gs26-smart-npc

Thank you for your interest in contributing! We welcome contributions of any kind – bug reports, documentation improvements, feature enhancements, or code changes.

## How to Contribute

1. **Fork the repository**
   Click the **Fork** button at the top right of the repository page to create your own copy.

2. **Clone your fork**
   ```bash
   git clone https://github.com/<your-username>/gs26-smart-npc.git
   cd gs26-smart-npc
   ```

3. **Create a new branch** for your work:
   ```bash
   git checkout -b my-feature-branch
   ```

4. **Make your changes**
   - Keep the code style consistent with the existing files.
   - Update the `README.md` if you add new functionality.

5. **Commit your changes**
   ```bash
   git add .
   git commit -m "Describe your changes"
   ```

6. **Push to your fork**
   ```bash
   git push origin my-feature-branch
   ```

7. **Open a Pull Request**
   - Go to the original repository and click **New Pull Request**.
   - Select your branch as the source and the `main` branch of the upstream repo as the target.
   - Fill out the PR template (see `PULL_REQUEST_TEMPLATE.md` if present) and submit.

## Pull Request Checklist

- [ ] The PR describes the purpose and any relevant background.
- [ ] The code follows the existing style and passes `npm run lint` (if linting is set up).
- [ ] The project builds and runs with `npm run dev`.
- [ ] Documentation (README, comments) is updated as needed.

## Code of Conduct
All contributors must adhere to our [Code of Conduct](CODE_OF_CONDUCT.md).

## Issues
If you encounter a bug or have a suggestion, please open an issue first and provide a clear description and steps to reproduce.
