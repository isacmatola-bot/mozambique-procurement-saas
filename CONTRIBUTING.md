# Contributing Guidelines

## Code Style
- Use TypeScript for type safety
- Follow ESLint and Prettier configurations
- Write unit tests for new features

## Branching Strategy
- `main` - Production ready
- `develop` - Development branch
- Feature branches: `feature/description`
- Bugfix branches: `bugfix/description`

## Pull Request Process
1. Create feature branch
2. Make changes and commit
3. Write/update tests
4. Create PR with clear description
5. Code review
6. Merge to develop, then main

## Testing
All features must include tests:
```bash
npm run test
npm run test:coverage
```

## Deployment
Deployment to production requires:
- All tests passing
- Code review approval
- Documentation updated
