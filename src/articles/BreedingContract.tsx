/* eslint-disable react-refresh/only-export-components */
import CodeBlock from "@/components/layouts/CodeBlock";

export const articleMeta = {
    id: "breeding-contract",
    title: "Breeding Contract",
    subtitle: "Combine two parent NFTs to produce a deterministic child token",
    date: "2025-02-19T14:30:00.000Z",
    readTime: "9 min read",
    tags: ["plutus", "cardano", "nft", "minting", "intermediate"],
    author: {
        name: "Aman Kumar",
        avatar: "https://i.pravatar.cc/48?img=15",
    },
    plutusVersion: "V2",
    complexity: "Intermediate",
    useCase: "NFTs",

};

export default function BreedingContractArticle() {
    const haskellCode = `{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE ImportQualifiedPost #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE OverloadedStrings   #-}
{-# LANGUAGE TemplateHaskell     #-}

module BreedingContract where

import qualified Plutus.V2.Ledger.Api      as PlutusV2
import           PlutusTx                  (BuiltinData, compile, unstableMakeIsData)
import           PlutusTx.Prelude          (Bool (False), Integer, BuiltinByteString,
                                            traceIfFalse, (==), (&&), ($), (>), length,
                                            filter, map, appendByteString)
import           PlutusTx.Builtins         (blake2b_256)
import           Plutus.V1.Ledger.Value    (flattenValue, valueOf)
import           Prelude                   (IO)
import           Utilities                 (wrapValidator, writeValidatorToFile)

-- | Datum stores the breeding setup: which collection the parents belong to,
-- which policy is allowed to mint children, and the fee details.

data BreedingDatum = BreedingDatum
    { parentPolicyId   :: PlutusV2.CurrencySymbol
    , childPolicyId    :: PlutusV2.CurrencySymbol
    , breedingFee      :: Integer          -- lovelace
    , feeCollector     :: PlutusV2.PubKeyHash
    }
PlutusTx.unstableMakeIsData ''BreedingDatum

-- Redeemer carries the two parent token names so we can look them up in inputs
data BreedingRedeemer = Breed
    { parentA :: PlutusV2.TokenName
    , parentB :: PlutusV2.TokenName
    }
PlutusTx.unstableMakeIsData ''BreedingRedeemer

{-# INLINABLE mkBreedingValidator #-}
mkBreedingValidator :: BreedingDatum -> BreedingRedeemer -> PlutusV2.ScriptContext -> Bool
mkBreedingValidator dat (Breed pA pB) ctx =
    traceIfFalse "Parent A NFT not found in inputs!" (parentInInputs pA) &&
    traceIfFalse "Parent B NFT not found in inputs!" (parentInInputs pB) &&
    traceIfFalse "Exactly one child NFT must be minted!" exactlyOneChildMinted &&
    traceIfFalse "Child token name doesn't match parent hash!" childNameValid &&
    traceIfFalse "Breeding fee not paid!" feePaid
  where
    info :: PlutusV2.TxInfo
    info = PlutusV2.scriptContextTxInfo ctx

    parentInInputs :: PlutusV2.TokenName -> Bool
    parentInInputs tn =
        let inputValues = map (PlutusV2.txOutValue . PlutusV2.txInInfoResolved)
                              (PlutusV2.txInfoInputs info)
            counts      = map (\\v -> valueOf v (parentPolicyId dat) tn) inputValues
        in length (filter (> 0) counts) > 0

    childMintEntries :: [(PlutusV2.CurrencySymbol, PlutusV2.TokenName, Integer)]
    childMintEntries =
        filter (\\(cs, _, _) -> cs == childPolicyId dat) (flattenValue (PlutusV2.txInfoMint info))

    exactlyOneChildMinted :: Bool
    exactlyOneChildMinted = case childMintEntries of
        [(_, _, amt)] -> amt == 1
        _             -> False

    -- Child name = blake2b_256(parentA ++ parentB). Deterministic.
    expectedChildName :: PlutusV2.TokenName
    expectedChildName =
        let PlutusV2.TokenName rawA = pA
            PlutusV2.TokenName rawB = pB
        in PlutusV2.TokenName (blake2b_256 (appendByteString rawA rawB))

    childNameValid :: Bool
    childNameValid = case childMintEntries of
        [(_, childTn, _)] -> childTn == expectedChildName
        _                 -> False

    feePaid :: Bool
    feePaid =
        let paidToCollector = PlutusV2.valuePaidTo info (feeCollector dat)
        in valueOf paidToCollector PlutusV2.adaSymbol PlutusV2.adaToken
             >= breedingFee dat

{-# INLINABLE wrappedMkVal #-}
wrappedMkVal :: BuiltinData -> BuiltinData -> BuiltinData -> ()
wrappedMkVal = wrapValidator mkBreedingValidator

validator :: PlutusV2.Validator
validator =
  PlutusV2.mkValidatorScript
    $$(PlutusTx.compile [|| wrappedMkVal ||])

saveVal :: IO ()
saveVal = writeValidatorToFile "./assets/breeding.plutus" validator
`;

    const bashCommands = `# 1. Lock the breeding config at the script address
# Datum: parent policy, child mint policy, 25 ADA fee, fee collector PKH
$ cardano-cli conway transaction build \\
  --tx-in 3cf82a1d7e94b056f2c81e9da40b7365f18c2d0b49ae7153c6f80e2d91a4b3c7#0 \\
  --tx-out $(cat breeding.addr)+5000000 \\
  --tx-out-inline-datum-value '{"constructor":0,"fields":[{"bytes":"parent_policy_aaa..."},{"bytes":"child_policy_bbb..."},{"int":25000000},{"bytes":"fee_collector_pkh_ccc..."}]}' \\
  --change-address addr_test17vw9muyewnhc82c0ggpdghu9n975h8k5xkhq0agxdgmf5fa8xvdve \\
  --testnet-magic 2 \\
  --out-file tx-setup-breeding.raw

# ... sign and submit ...

-------------------------------------------------------------------------

# 2. Breed: spend both parent NFTs + config, mint the child
# Redeemer: Breed {parentA: "DragonA_hex", parentB: "DragonB_hex"}
$ cardano-cli conway transaction build \\
  --tx-in a91c4d2e8b37f0561c2de94a7053b186f2c8d40e9b71a35c60f8e2d3b4a7c1f9#0 \\
  --tx-in d4e2b17c903a56f81c2e94da70b3651f8c2d40b9ea71535c6f0e82d9a14b3c7e#0 \\
  --tx-in f8c2d40b9ea7153c6f0e82d91a4b3c7e3cf82a1d7e94b056f2c81e9da40b7365#0 \\
  --tx-in-script-file breeding.plutus \\
  --tx-in-inline-datum-present \\
  --tx-in-redeemer-value '{"constructor":0,"fields":[{"bytes":"447261676f6e41"},{"bytes":"447261676f6e42"}]}' \\
  --mint "1 $(cat child_policy.id).child_token_name_hash_hex" \\
  --mint-script-file child_mint.plutus \\
  --mint-redeemer-value '{"constructor": 0, "fields": []}' \\
  --tx-out addr_test1_breeder_address+"2000000 + 1 $(cat child_policy.id).child_token_name_hash_hex" \\
  --tx-out addr_test1_fee_collector_address+25000000 \\
  --required-signer-hash breeder_pkh_hash_here \\
  --tx-in-collateral 7c903a56f81c2e94da70b3651f8c2d40b9ea7153c6f0e82d91a4b3c7e3cf82a1#0 \\
  --change-address addr_test1_breeder_address \\
  --testnet-magic 2 \\
  --out-file tx-breed.raw

$ cardano-cli conway transaction sign \\
  --tx-body-file tx-breed.raw \\
  --signing-key-file ../../../keys/breeder.skey \\
  --testnet-magic 2 \\
  --out-file tx-breed.signed

$ cardano-cli conway transaction submit --tx-file tx-breed.signed
`;

    return (
        <div className="article-content">
            <h2 id="introduction">Introduction</h2>

            <p>
                Breeding mechanics are one of the most popular features in NFT-based games
                (CryptoKitties being the obvious example). The idea is simple: take two
                parent NFTs, combine them, and get a unique child NFT as output.
            </p>

            <p>
                This contract enforces the entire breeding process on-chain. It verifies
                that both parent NFTs are actually present in the transaction inputs,
                mints exactly one child NFT with a deterministic name derived from the
                parents, and makes sure the breeding fee gets paid.
            </p>

            <CodeBlock
                code={haskellCode}
                language="haskell"
                filename="BreedingContract.hs"
            />
            <br />

            <h2 id="explanation">How It Works</h2>

            <h3>Proving you own the parents</h3>

            <p className="pexplaination">
                Claiming you own two NFTs is easy. Actually proving it requires spending
                them — on Cardano, consuming a UTxO needs the owner's signature (or the
                script's approval). So the validator scans every input in the transaction
                looking for the parent tokens:
            </p>

            <CodeBlock
                code={`parentInInputs tn =
    let inputValues = map (PlutusV2.txOutValue . PlutusV2.txInInfoResolved)
                          (PlutusV2.txInfoInputs info)
        counts      = map (\\v -> valueOf v (parentPolicyId dat) tn) inputValues
    in length (filter (> 0) counts) > 0`}
                language="haskell"
                filename="Scanning Inputs for Parents"
            />

            <p className="pexplaination">
                If both parents aren't physically in the tx inputs, breeding fails. Simple.
            </p>

            <h3>How child names work</h3>

            <p className="pexplaination pt-2">
                The child's token name is <code>blake2b_256(parentA ++ parentB)</code>. So
                Dragon A + Dragon B always produces the same child. This has a nice side
                effect: you can't breed the same pair twice to get different children, and
                the whole lineage is auditable on-chain by re-hashing the names.
            </p>

            <CodeBlock
                code={`expectedChildName =
    let PlutusV2.TokenName rawA = pA
        PlutusV2.TokenName rawB = pB
    in PlutusV2.TokenName (blake2b_256 (appendByteString rawA rawB))`}
                language="haskell"
                filename="Deterministic Child Name"
            />

            <h3>The fee</h3>

            <p className="pexplaination pt-2">
                The datum specifies a <code>breedingFee</code> in Lovelace and a{" "}
                <code>feeCollector</code> address. The validator uses{" "}
                <code>valuePaidTo</code> to check the fee actually arrives. Same pattern
                as the Escrow validator if you've seen that one.
            </p>

            <br />

            <h2 id="execution">Execution</h2>

            <p className="pexplaination">
                A breeding transaction involves multiple inputs (two parents + the breeding
                config UTxO), a minting operation (the child), and a fee payment — all packed
                into one atomic transaction. If any check fails, the whole thing is rolled
                back.
            </p>

            <CodeBlock
                code={bashCommands}
                language="bash"
                filename="Breeding CLI Commands"
            />

            <h3>Gotchas</h3>

            <p className="pexplaination pt-2">
                Note that order matters for the child name hash — breeding Dragon A with
                Dragon B gives a different name than breeding B with A. If you want
                order-independent results, you'd need to sort the two names before hashing.
                This contract keeps it simple and leaves order as-is.
            </p>

        </div>
    );
}
