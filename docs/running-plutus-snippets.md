# Compiling and Running Snippets

How to compile and execute Plutus snippets from this project on Cardano testnets.

Assumes basic familiarity with Cardano and Plutus development.

---

## Supported Environments

Snippets are compatible with:
- **Plutus V1**
- **Plutus V2**

Validated using:
- `plinth-template`
- `Plutus Pioneer Program (PPP)` repositories

---

## Prerequisites

- Linux or macOS
- `cardano-cli` in `PATH`
- Access to a test network (preview or preprod)
- A funded testnet wallet

---

## Option 1: plinth-template

### 1. Clone
```bash
git clone https://github.com/IntersectMBO/plinth-template.git
cd plinth-template 
```

### 2. Build
```bash
cabal build
```

### 3. Add Snippet
Copy the snippet into the `src/` directory. Ensure:
- Correct Plutus version imports (V1 or V2)
- Required language pragmas are present

Example:
```hs
import PlutusLedgerApi.V2
```

### 4. Compile
```bash
cabal run <executable-name>
```
Produces a serialized `.plutus` script.

---

## Option 2: PPP Repositories

### 1. Build
```bash
cabal build
```

### 2. Generate Validator
```bash
cabal run <script-generator>
```

---

## On-Chain Submission

Once the script is generated:
1. Create a transaction using `cardano-cli`.
2. Attach the compiled Plutus script.
3. Provide datum and redeemer.
4. Submit to testnet.

### Example
```bash
cardano-cli transaction submit \
  --tx-file tx.signed \
  --testnet-magic 2
```
