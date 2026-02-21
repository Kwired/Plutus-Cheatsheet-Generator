/* eslint-disable react-refresh/only-export-components */
import CodeBlock from "@/components/layouts/CodeBlock";

export const articleMeta = {
    id: "single-asset-minting",
    title: "Single Asset Minting",
    subtitle: "A Minting Policy that enforces only a specific, hardcoded Token Name can be minted",
    date: "2025-02-21T10:00:00.000Z",
    readTime: "6 min read",
    tags: ["plutus", "cardano", "minting", "tokens", "intermediate"],
    author: {
        name: "Aman Kumar",
        avatar: "https://i.pravatar.cc/48?img=11"},
  plutusVersion: "V2",
  complexity: "Advanced",
  useCase: "NFTs"
};

export default function SingleAssetMintingArticle() {
    const haskellCode = `{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE ImportQualifiedPost #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE OverloadedStrings   #-}
{-# LANGUAGE TemplateHaskell     #-}

module SingleAssetMinting where

import qualified Plutus.V2.Ledger.Api as PlutusV2
import           PlutusTx             (BuiltinData, compile)
import           PlutusTx.Prelude     (Bool, traceIfFalse, (==), ($))
import           Plutus.V1.Ledger.Value (flattenValue)
import           Prelude              (IO)
import           Utilities            (wrapPolicy, writeCodeToFile)

---------------------------------------------------------------------------------------------------
----------------------------------- ON-CHAIN / MINTING POLICY -------------------------------------

-- This policy ignores the Redeemer, but tightly controls the resulting transaction outputs.
-- It enforces that under its specific PolicyID, only the token name "MySpecialToken" 
-- is allowed to be minted or burned. If someone tries to mint a token called 
-- "FakeToken" under this same PolicyID, it will be rejected.

{-# INLINABLE mkSingleAssetPolicy #-}
mkSingleAssetPolicy :: () -> PlutusV2.ScriptContext -> Bool
mkSingleAssetPolicy () ctx =
    traceIfFalse "You are attempting to mint an unauthorized Token Name!" checkTokenName
  where
    info :: PlutusV2.TxInfo
    info = PlutusV2.scriptContextTxInfo ctx

    -- A transaction can mint tokens from multiple different policies at once.
    -- We must flatten the mint map and pattern match to extract exactly 
    -- what is happening under OUR specific policy evaluation.
    checkTokenName :: Bool
    checkTokenName = case flattenValue (PlutusV2.txInfoMint info) of
        -- If exactly one token type is being minted, we check its name.
        [(_, name, _)] -> name == PlutusV2.TokenName "MySpecialToken"
        -- If zero tokens, or more than one token type is being minted, reject.
        _              -> False

{-# INLINABLE wrappedPolicy #-}
wrappedPolicy :: BuiltinData -> BuiltinData -> ()
wrappedPolicy = wrapPolicy mkSingleAssetPolicy

policy :: PlutusV2.MintingPolicy
policy = PlutusV2.mkMintingPolicyScript
    $$(PlutusTx.compile [|| wrappedPolicy ||])

---------------------------------------------------------------------------------------------------
------------------------------------- HELPER FUNCTIONS --------------------------------------------

savePol :: IO ()
savePol = writeCodeToFile "./assets/single_asset.plutus" policy
`;

    const bashCommands = `# 1. Calculate the Policy ID
$ cardano-cli conway transaction policyid \\
  --script-file single_asset.plutus > policy.id

# 2. Attempt to Mint the Correct Token
# "MySpecialToken" in Hex string is: 4d795370656369616c546f6b656e
$ cardano-cli conway transaction build \\
  --tx-in dummy_tx_hash_uuid_here_2222222222222222#0 \\
  --mint "1000000 $(cat policy.id).4d795370656369616c546f6b656e" \\
  --mint-script-file single_asset.plutus \\
  --mint-redeemer-value '{"constructor": 0, "fields": []}' \\
  --tx-out addr_test1_dummy_receiver_address_here+"2000000 + 1000000 $(cat policy.id).4d795370656369616c546f6b656e" \\
  --tx-in-collateral dummy_collateral_hash_uuid_here_33333333#0 \\
  --change-address addr_test1_dummy_address_here \\
  --testnet-magic 2 \\
  --out-file tx-mint.raw

$ cardano-cli conway transaction sign \\
  --tx-body-file tx-mint.raw \\
  --signing-key-file ../../../keys/payment.skey \\
  --testnet-magic 2 \\
  --out-file tx-mint.signed

$ cardano-cli conway transaction submit --tx-file tx-mint.signed

-------------------------------------------------------------------------

# 3. Attempt to Mint the Wrong Token (WILL FAIL)
# "FakeToken" in Hex string is: 46616b65546f6b656e
# If we try to mint 1000000 $(cat policy.id).46616b65546f6b656e 
# The Plutus script evaluation will instantly fail because 
# "FakeToken" != "MySpecialToken".
`;

    return (
        <div className="article-content">
            <h2 id="introduction">Introduction</h2>

            <p>
                On Cardano, a single <strong>Minting Policy</strong> can theoretically govern the
                creation of millions of uniquely named tokens. For example, an NFT collection
                uses one Policy ID to mint 10,000 tokens, each named exactly
                <code>SpaceBears1</code> through <code>SpaceBears10000</code>.
            </p>

            <p>
                But what if you are creating a fungible token (like a stablecoin or utility token)
                and you want unquestionable proof that the policy will <em>never</em> mint random,
                confusing secondary tokens? The <strong>Single Asset Minting</strong> policy
                enforces this at the code level.
            </p>

            <CodeBlock
                code={haskellCode}
                language="haskell"
                filename="SingleAssetMinting.hs"
            />
            <br />

            <h2 id="explanation">How It Really Works</h2>

            <h3>Strict List Matchings</h3>

            <p className="pexplaination">
                In Plutus, developers often extract the Mint Map and match against it. The
                safest way to enforce a strict boundary is to use pattern matching on single-item lists.
            </p>

            <CodeBlock
                code={`checkTokenName = case flattenValue (PlutusV2.txInfoMint info) of
    [(_, name, _)] -> name == PlutusV2.TokenName "MySpecialToken"
    _              -> False`}
                language="haskell"
                filename="Guarding the Array Length"
            />

            <p className="pexplaination">
                This pattern match <code>[(_, name, _)]</code> is brilliant because it kills two
                birds with one stone:
                <br /><br />
                1. It ensures that <em>exactly one type of token</em> is being minted under this
                script's execution. If an attacker tries to mint "MySpecialToken" AND "FakeToken"
                in the same transaction, the array length will be 2, the pattern match fails, and
                the transaction is rejected via the wildcard <code>_ {">"} False</code>.
                <br />
                2. It extracts the <code>name</code> variable so we can strictly verify it equals
                our hardcoded literal string.
            </p>

            <br />

            <h2 id="execution">Execution Lifecycle</h2>

            <p className="pexplaination">
                When passing token names to the CLI, Cardano highly encourages passing them in
                Hexadecimal format rather than raw ASCII.
            </p>

            <CodeBlock
                code={bashCommands}
                language="bash"
                filename="Single Asset CLI Commands"
            />

            <h3>Trust via Verification</h3>

            <p className="pexplaination pt-2">
                By deploying this script, developers give their community mathematical guarantees.
                Anyone can examine the open-source Haskell, compile it to Plutus Core, and verify
                that its hash matches the Policy ID. If it does, they know with 100% certainty that
                no secondary or scam tokens can ever be minted under that official Policy ID.
            </p>

        </div>
    );
}
