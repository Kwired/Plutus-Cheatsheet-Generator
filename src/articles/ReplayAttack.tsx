import CodeBlock from "@/components/layouts/CodeBlock";

export const articleMeta = {
    id: "replayattack",
    title: "Replay Attack Vulnerability",
    subtitle: "A vulnerability where an attacker resubmits the same transaction to repeatedly drain funds or mint extra tokens",
    date: "2025-02-25T09:00:00.000Z",
    readTime: "8 min read",
    tags: ["plutus", "cardano", "security", "exploit", "advanced"],
    author: {
        name: "Aman Kumar",
        avatar: "https://i.pravatar.cc/48?img=21",
    },
};

export default function ReplayAttackArticle() {
    const haskellCode = `{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE ImportQualifiedPost #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE OverloadedStrings   #-}
{-# LANGUAGE TemplateHaskell     #-}

module ReplayAttack where

import qualified Plutus.V2.Ledger.Api as PlutusV2
import           PlutusTx             (BuiltinData, compile)
import           PlutusTx.Prelude     (Bool, traceIfFalse, ($))
import           Prelude              (IO)
import           Utilities            (wrapPolicy, writePolicyToFile)

---------------------------------------------------------------------------------------------------
----------------------------------- ON-CHAIN / VULNERABLE POLICY ----------------------------------

-- ❌ VULNERABLE DESIGN ❌
-- This minting policy intends to only allow the "admin" to mint the token.
-- It checks the signature successfully. But it completely forgets to bind the minting
-- action to a specific, unique UTxO or time interval.

{-# INLINABLE mkVulnerableMintingPolicy #-}
mkVulnerableMintingPolicy :: PlutusV2.PubKeyHash -> () -> PlutusV2.ScriptContext -> Bool
mkVulnerableMintingPolicy adminPkh () ctx = 
    -- The script accurately verifies the admin signed the transaction.
    -- However, once the admin signs a transaction to mint 100 tokens...
    -- What stops them (or someone watching the mempool who steals the signature) 
    -- from submitting the exact same mathematical payload again 5 minutes later?
    traceIfFalse "Missing admin signature!" signedByAdmin
  where
    info :: PlutusV2.TxInfo
    info = PlutusV2.scriptContextTxInfo ctx

    signedByAdmin :: Bool
    signedByAdmin = PlutusV2.txSignedBy info adminPkh


---------------------------------------------------------------------------------------------------
----------------------------------- THE FIX: TXOUTREF BINDING -------------------------------------

-- ✅ SECURE DESIGN ✅
-- By baking a specific TxOutRef (Transaction Hash + Index) into the script parameter,
-- the protocol guarantees this script can only ever evaluate to True ONE time in the entire
-- history of the universe, because UTxOs can only be consumed once!

{-# INLINABLE mkSecureMintingPolicy #-}
mkSecureMintingPolicy :: PlutusV2.TxOutRef -> PlutusV2.PubKeyHash -> () -> PlutusV2.ScriptContext -> Bool
mkSecureMintingPolicy utxo adminPkh () ctx = 
    traceIfFalse "Missing admin signature!" signedByAdmin &&
    -- The transaction MUST consume the exact UTxO burned into the script parameter.
    traceIfFalse "The required UTxO was not consumed!" hasUtxo
  where
    info :: PlutusV2.TxInfo
    info = PlutusV2.scriptContextTxInfo ctx

    signedByAdmin :: Bool
    signedByAdmin = PlutusV2.txSignedBy info adminPkh

    hasUtxo :: Bool
    hasUtxo = PlutusTx.Prelude.any (\\i -> PlutusV2.txInInfoOutRef i PlutusTx.Prelude.== utxo) (PlutusV2.txInfoInputs info)

{-# INLINABLE wrappedVulnPolicy #-}
wrappedVulnPolicy :: BuiltinData -> BuiltinData -> ()
wrappedVulnPolicy = wrapPolicy mkVulnerableMintingPolicy

policy :: PlutusV2.MintingPolicy
policy = PlutusV2.mkMintingPolicyScript $$(PlutusTx.compile [|| wrappedVulnPolicy ||])
`;

    const bashCommands = `# Scenario: The admin creates a transaction to mint 1,000 "GalaTokens" for an airdrop.
# The policy ONLY checks that the admin signed it.

# -------------------------------------------------------------------------
# 1. The Legitimate Mint (Transaction A)
$ cardano-cli conway transaction build \\
  --tx-in f29c7d41ef993...#0 \\
  --mint "1000 a0028f...GalaToken" \\
  --mint-script-file vulnerable_policy.plutus \\
  --mint-redeemer-value '{"constructor":0,"fields":[]}' \\
  --required-signer-hash admin_hash_a8b9... \\
  --tx-out $(cat airdrop.addr)+2000000+"1000 a0028f...GalaToken" \\
  --change-address $(cat admin.addr) \\
  --testnet-magic 2 \\
  --out-file tx-mint1.raw

$ cardano-cli conway transaction sign --tx-body-file tx-mint1.raw --signing-key-file admin.skey --testnet-magic 2 --out-file tx-mint1.signed
$ cardano-cli conway transaction submit --tx-file tx-mint1.signed

# -------------------------------------------------------------------------
# 2. THE REPLAY ATTACK (Transaction B)
# 10 minutes later, the admin wants to mint 1,000 MORE tokens for their private wallet.
# Because the script parameters haven't changed, the Policy ID of the token hasn't changed.
# They just build a NEW transaction, provide a NEW signature for it, and mint infinite tokens
# effortlessly, completely destroying the tokenomics of the project.

$ cardano-cli conway transaction build \\
  --tx-in d83b72c91a4bc...#1 \\  <-- A completely different input UTxO paying the fee
  --mint "1000 a0028f...GalaToken" \\  <-- The exact same policy ID!
  --mint-script-file vulnerable_policy.plutus \\
  --mint-redeemer-value '{"constructor":0,"fields":[]}' \\
  --required-signer-hash admin_hash_a8b9... \\
  --tx-out $(cat malicious_admin.addr)+2000000+"1000 a0028f...GalaToken" \\
  --change-address $(cat malicious_admin.addr) \\
  --testnet-magic 2 \\
  --out-file tx-attack.raw

$ cardano-cli conway transaction sign --tx-body-file tx-attack.raw --signing-key-file admin.skey --testnet-magic 2 --out-file tx-attack.signed
$ cardano-cli conway transaction submit --tx-file tx-attack.signed
`;

    return (
        <div className="article-content">
            <h2 id="introduction">Introduction</h2>

            <p>
                Imagine a bank vault that opens if you insert a massive, highly secure cryptographic key. You walk up, insert the key, the door opens, and you take out $1,000. You close the door. Five minutes later, you walk up, insert the exact same key, the door opens again, and you take another $1,000.
            </p>

            <p>
                This is a <strong>Replay Attack</strong>. On simpler blockchains, if a smart contract evaluates a condition as <code>True</code>, an attacker can simply record the network traffic, copy the exact parameters, and submit the exact same transaction a second time to trick the contract into evaluating as <code>True</code> again.
            </p>

            <CodeBlock
                code={haskellCode}
                language="haskell"
                filename="ReplayAttack.hs"
            />
            <br />

            <h2 id="explanation">The Vulnerability Explained</h2>

            <h3>The Illusion of Signatures</h3>

            <p className="pexplaination">
                In the vulnerable code above, the developer felt secure. They added <code>txSignedBy</code> to explicitly ensure that only the project's Administrator could mint the token. If an ordinary user tries to mint the token, the script rejects it because they lack the admin's private key.
            </p>

            <p className="pexplaination pt-2">
                However, this architecture has a serious flaw. Because the <code>adminPkh</code> is hardcoded into the script parameters, the resulting <strong>Policy ID</strong> (the hash of the script + parameters) is fixed. As long as the admin signs the transaction, the script returns <code>True</code>. The admin (or an attacker who compromises the admin's keys) can submit unlimited minting transactions, inflating the supply arbitrarily.
            </p>

            <h3>The Fix: Forcing Uniqueness</h3>

            <CodeBlock
                code={`hasUtxo = PlutusTx.Prelude.any (\\i -> PlutusV2.txInInfoOutRef i == utxo) (PlutusV2.txInfoInputs info)`}
                language="haskell"
                filename="The One-Shot Pattern"
            />

            <p className="pexplaination pt-2">
                Cardano's eUTxO model provides the ultimate cryptographic defense against replay attacks: <strong>UTxOs can only be consumed exactly once.</strong>
            </p>

            <p className="pexplaination">
                If you pass a specific <code>TxOutRef</code> (e.g., <code>f29c7d...#0</code>) into your validator as a parameter, and require that UTxO to be present in the transaction inputs, replay becomes impossible. When the first transaction executes, <code>f29c7d...#0</code> is consumed and gone. If an attacker tries to replay the same transaction later, the ledger rejects it with a <code>ValueNotConserved</code> or <code>BadInputs</code> error because the UTxO no longer exists. 
            </p>

            <br />

            <h2 id="execution">The Attacker's CLI Lifecycle</h2>

            <p className="pexplaination">
                In this execution trace, the Admin (or someone with the Admin's keys) executes the replay attack. Because the token's Policy ID is derived purely from the script code + the Admin's PubKeyHash (both static), the attacker can fund a new transaction using a different fee UTxO, sign it, and mint tokens again.
            </p>

            <CodeBlock
                code={bashCommands}
                language="bash"
                filename="The Replay Exploit"
            />

        </div>
    );
}
