import CodeBlock from "@/components/layouts/CodeBlock";

export const articleMeta = {
    id: "burn-only-policy",
    title: "Burn Only Policy",
    subtitle: "A Minting Policy that strictly prohibits minting and only allows burning",
    date: "2025-02-20T10:00:00.000Z",
    readTime: "5 min read",
    tags: ["plutus", "cardano", "minting", "tokens", "basics"],
    author: {
        name: "Aman Kumar",
        avatar: "https://i.pravatar.cc/48?img=10",
    },
};

export default function BurnOnlyPolicyArticle() {
    const haskellCode = `{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE ImportQualifiedPost #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE OverloadedStrings   #-}
{-# LANGUAGE TemplateHaskell     #-}

module BurnOnlyPolicy where

import qualified Plutus.V2.Ledger.Api as PlutusV2
import           PlutusTx             (BuiltinData, compile)
import           PlutusTx.Prelude     (Bool, traceIfFalse, all, (<), ($))
import           Plutus.V1.Ledger.Value (flattenValue)
import           Prelude              (IO)
import           Utilities            (wrapPolicy, writeCodeToFile)

---------------------------------------------------------------------------------------------------
----------------------------------- ON-CHAIN / MINTING POLICY -------------------------------------

-- Minting Policies do not use a Datum. They only take a Redeemer and the Context.
-- For this simple policy, we ignore the Redeemer completely.

{-# INLINABLE mkBurnOnlyPolicy #-}
mkBurnOnlyPolicy :: () -> PlutusV2.ScriptContext -> Bool
mkBurnOnlyPolicy () ctx =
    traceIfFalse "Minting is strictly forbidden. You may only burn!" isBurning
  where
    info :: PlutusV2.TxInfo
    info = PlutusV2.scriptContextTxInfo ctx

    -- We must verify that for *every single token* associated with this policy's 
    -- CurrencySymbol in the transaction, the quantity being "minted" is less than 0.
    isBurning :: Bool
    isBurning = all (\(_, _, amt) -> amt < 0) (flattenValue (PlutusV2.txInfoMint info))

{-# INLINABLE wrappedPolicy #-}
wrappedPolicy :: BuiltinData -> BuiltinData -> ()
wrappedPolicy = wrapPolicy mkBurnOnlyPolicy

policy :: PlutusV2.MintingPolicy
policy = PlutusV2.mkMintingPolicyScript
    $$(PlutusTx.compile [|| wrappedPolicy ||])

---------------------------------------------------------------------------------------------------
------------------------------------- HELPER FUNCTIONS --------------------------------------------

savePol :: IO ()
savePol = writeCodeToFile "./assets/burn_only.plutus" policy
`;

    const bashCommands = `# 1. Calculate the Policy ID
# A minting policy doesn't have an address, it has a Policy ID (the hash of the script).
$ cardano-cli conway transaction policyid \\
  --script-file burn_only.plutus > policy.id

# 2. Attempt to Mint (This will FAIL)
# If you try to run a transaction with --mint "1000 $(cat policy.id).Token", 
# the Plutus script will reject it because 1000 is not less than 0!

-------------------------------------------------------------------------

# 3. Burn Existing Tokens
# To burn tokens on Cardano, you "mint" them with a negative quantity (-100).
# In order to burn tokens, they must actually exist in the UTxO you are consuming!
$ cardano-cli conway transaction build \\
  --tx-in dummy_tx_hash_uuid_here_2222222222222222#0 \\
  --mint "-100 $(cat policy.id).4d79546f6b656e" \\
  --mint-script-file burn_only.plutus \\
  --mint-redeemer-value '{"constructor": 0, "fields": []}' \\
  --tx-out addr_test1_dummy_receiver_address_here+"2000000 + 400 $(cat policy.id).4d79546f6b656e" \\
  --tx-in-collateral dummy_collateral_hash_uuid_here_33333333#0 \\
  --change-address addr_test1_dummy_address_here \\
  --testnet-magic 2 \\
  --out-file tx-burn.raw

$ cardano-cli conway transaction sign \\
  --tx-body-file tx-burn.raw \\
  --signing-key-file ../../../keys/payment.skey \\
  --testnet-magic 2 \\
  --out-file tx-burn.signed

$ cardano-cli conway transaction submit --tx-file tx-burn.signed
Transaction successfully submitted.
`;

    return (
        <div className="article-content">
            <h2 id="introduction">Introduction</h2>

            <p>
                Minting Policies are a special type of Plutus script. Instead of controlling
                how funds are spent from a UTxO address, they control the creation and
                destruction of Native Tokens across the entire Cardano blockchain.
            </p>

            <p>
                The <strong>Burn Only Policy</strong> is exactly what it sounds like: a policy
                that unconditionally rejects any attempt to mint new tokens, but always allows
                users to burn existing ones.
            </p>

            <CodeBlock
                code={haskellCode}
                language="haskell"
                filename="BurnOnlyPolicy.hs"
            />
            <br />

            <h2 id="explanation">How It Really Works</h2>

            <h3>Minting vs. Spending</h3>

            <p className="pexplaination">
                Minting scripts only take two arguments: <code>Redeemer</code> and <code>ScriptContext</code>.
                There is no Datum because minting policies exist globally to enforce the supply
                of a token, not locally to protect a specific UTxO.
            </p>

            <CodeBlock
                code={`isBurning = all (\\(_, _, amt) -> amt < 0) (flattenValue (PlutusV2.txInfoMint info))`}
                language="haskell"
                filename="Checking Mint Values"
            />

            <p className="pexplaination">
                In Cardano, "Burning" is simply defined as "Minting a negative quantity."
                The <code>txInfoMint</code> function extracts a map of all tokens being minted
                in the current transaction. We flatten that map into a list, and enforce that
                for <strong>all</strong> of them, the amount <code>amt</code> must be less than 0.
            </p>

            <br />

            <h2 id="execution">Execution Lifecycle</h2>

            <p className="pexplaination">
                When executing a transaction with a minting script, you don't interact with
                a locking address. Instead, you use the script directly in the <code>--mint</code> flag.
            </p>

            <CodeBlock
                code={bashCommands}
                language="bash"
                filename="Burn Only CLI Commands"
            />

            <h3>The Paradox of Genesis</h3>

            <p className="pexplaination pt-2">
                You might realize an obvious problem: If this policy only allows burning,
                how did the tokens get created in the first place? <br /><br />
                In reality, a strict Burn Only policy is useless on its own. It is typically
                paired with advanced parameterized scripts where the script logic changes based
                on UTxO inputs, or it is used as an educational stepping stone to understand
                that Minting and Burning are governed by the exact same logic structure on Cardano.
            </p>

        </div>
    );
}
