/* eslint-disable react-refresh/only-export-components */
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
        avatar: "https://i.pravatar.cc/48?img=10"
    },
    plutusVersion: "V2",
    complexity: "Beginner",
    useCase: "NFTs"

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
    isBurning = all (\\\\(_, _, amt) -> amt < 0) (flattenValue (PlutusV2.txInfoMint info))

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
  --tx-in c0becb206eb4eba846f8298b04eacced16b3dba887ac2237849f002e4fac5ef9#0 \\
  --mint "-100 $(cat policy.id).4d79546f6b656e" \\
  --mint-script-file burn_only.plutus \\
  --mint-redeemer-value '{"constructor": 0, "fields": []}' \\
  --tx-out addr_test1yj2vsq8pf4szpkwx9gg6h30t0e5h7sh2fy40xf2hd4u3qzfgwrk4p+"2000000 + 400 $(cat policy.id).4d79546f6b656e" \\
  --tx-in-collateral d77ab4f1d064178c7cb6e630919f567ff8e3cd44b2b966e714aabfc5af476f87#0 \\
  --change-address addr_test1nxkdnx35gc77g9s2zauvfhhxu6k430ervhwkecwnjk7k0m864r0hj \\
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
                Minting Policies are a different type of Plutus script compared to validators. Instead of guarding a specific UTxO, they control the creation and destruction of Native Tokens across the entire network.
            </p>

            <p>
                The <strong>Burn Only Policy</strong> does what the name suggests: it rejects any attempt to mint new tokens but allows burning existing ones out of circulation.
            </p>

            <CodeBlock
                code={haskellCode}
                language="haskell"
                filename="BurnOnlyPolicy.hs"
            />
            <br />

            <h2 id="explanation">How It Works</h2>

            <h3>Minting vs. Spending</h3>

            <p className="pexplaination">
                Unlike Validator scripts, Minting scripts only ever take two arguments: the <code>Redeemer</code> and the <code>ScriptContext</code>. Because minting policies exist to globally enforce the supply rules of a token (rather than locally protecting a UTxO), they don't use a Datum at all.
            </p>

            <CodeBlock
                code={`isBurning = all (\\(_, _, amt) -> amt < 0) (flattenValue (PlutusV2.txInfoMint info))`}
                language="haskell"
                filename="Checking Mint Values"
            />

            <p className="pexplaination">
                On Cardano, there's no separate "burn" function. Burning is just minting with a negative quantity. The <code>txInfoMint</code> field contains all tokens being minted or burned in the transaction. We flatten it into a list and check that every token amount is less than 0.
            </p>

            <br />

            <h2 id="execution">Running the Code</h2>

            <p className="pexplaination">
                When you execute a transaction involving a minting script, you don't send funds to a locking address. Instead, you directly attach the script to the <code>--mint</code> flag itself.
            </p>

            <CodeBlock
                code={bashCommands}
                language="bash"
                filename="Burn Only CLI Commands"
            />

            <h3>A Note on Genesis</h3>

            <p className="pexplaination pt-2">
                There's an obvious question: if this policy only allows burning, how were the tokens minted in the first place? <br /><br />
                A hardcoded burn-only policy isn't useful on its own. In practice, it would be paired with parameterized or dynamic scripts where the minting logic changes based on transaction context. This example exists to demonstrate that minting and burning use the exact same mechanism on Cardano—the sign of the quantity is all that differs.
            </p>

        </div>
    );
}
