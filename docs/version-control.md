# Version Control

This document explains the Git Flow branching strategy used in this project.

## Git Flow Branching Strategy

I'm following the "Git Flow" pattern to manage the development process.

```mermaid
gitGraph
    commit id: "feat: rep init"
    branch develop
    commit id: "docs: setting up initial project docs"
    branch feature/BT-03-adding-docs
    checkout feature/BT-03-adding-docs
    commit id: "feat: adding component main-navbar.ts"
    commit id: "fix: color palette styles"
    checkout develop
    merge feature/BT-03-adding-docs
    branch release/v1.0.0
    checkout release/v1.0.0
    commit id: "bump: version v1.0.0"
    checkout main
    merge release/v1.0.0 tag: "v1.0.0"
    checkout develop
    merge release/v1.0.0
    branch hotfix/HOT-01-critical-rce
    checkout hotfix/HOT-01-critical-rce
    commit id: "chore: package with critical vulnerability (RCE)"
    checkout main
    merge hotfix/HOT-01-critical-rce tag: "v1.0.1"
    checkout develop
    merge hotfix/HOT-01-critical-rce
```

## Branches

### Main
The `main` branch contains the official release history. All code in `main` is ready for production environment.

### Develop
The `develop` branch serves as an integration branch for features. Once code is stable and ready for release, it is merged into `main` via a release branch.

### Feature Branches
Feature branches (`feature/*`) are used to develop new features. They should be created from `develop` and be merged back into `develop`.

### Release Branches
Release branches (`release/*`) support preparation of a new production release. They allow for minor bug fixes and preparing meta-data for a release. They should be created from `develop` and merged into both `main` and `develop`.

### Hotfix Branches
Hotfix branches (`hotfix/*`) are used to quick patches for production releases. They should be created from `main` and merged into both `main` and `develop` (or `release` if one is active).
