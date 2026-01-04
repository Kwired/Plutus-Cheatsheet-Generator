# Running Plutus Snippets on Cardano Testnet

This document explains how Plutus smart contract snippets from the
**Plutus Cheatsheet Generator** can be compiled and executed on
Cardano test networks using commonly adopted developer templates.

This guide assumes basic familiarity with Cardano and Plutus development.

---

## Supported Environments

The snippets in this project are compatible with:

- **Plutus V1**
- **Plutus V2**

They have been validated using standard community templates, including:
- `plinth-template`
- `Plutus Pioneer Program (PPP)`
repositories

---

## Prerequisites

Before running any snippet, ensure you have:

- A Linux or macOS environment
- `cardano-cli` available in `PATH`
- Access to a Cardano test network (preview or preprod)
- A funded testnet wallet

---

## Option 1: Using plinth-template

### 1. Clone the template

```bash
git clone https://github.com/IntersectMBO/plinth-template.git
cd plinth-template 

```
### 2. Build the project
```bash
cabal build
```

### 3. Add a snippet
Copy the Plutus snippet into the src/ directory and ensure:

- Correct Plutus version imports (V1 or V2)
- Required language pragmas are present

Example:
```hs
import PlutusLedgerApi.V2
```

### 4. Compile the script
```bash
cabal run <executable-name>
```
This produces a serialized `.plutus` script file.

---
## Option 2: Using Plutus Pioneer Program (PPP) Repositories

PPP repositories typically follow this workflow:

### 1. Build the project

```bash
cabal build
```
### 2. Generate the validator

```bash
cabal run <script-generator>
```
This command outputs a serialized Plutus script.

---

## Submitting the Script on Testnet

Once the script is generated:

- Create a transaction using `cardano-cli`
- Attach the compiled Plutus script
- Provide datum and redeemer as required
- Submit the transaction to the testnet

### Example (simplified)

```bash
cardano-cli transaction submit \
  --tx-file tx.signed \
  --testnet-magic 2
