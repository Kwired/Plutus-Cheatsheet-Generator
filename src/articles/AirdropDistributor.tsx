/* eslint-disable react-refresh/only-export-components */
import CodeBlock from "@/components/layouts/CodeBlock";

export const articleMeta = {
    id: "airdrop-distributor",
    title: "Airdrop Distributor",
    subtitle: "Token claims verified by Merkle proofs instead of a centralized whitelist",
    date: "2025-02-22T17:00:00.000Z",
    readTime: "9 min read",
    tags: ["plutus", "cardano", "tokens", "merkle-tree", "intermediate"],
    author: {
        name: "Aman Kumar",
        avatar: "https://i.pravatar.cc/48?img=19",
    },
    plutusVersion: "V2",
    complexity: "Intermediate",
    useCase: "Tokens",

};

export default function AirdropDistributorArticle() {
    const haskellCode = `{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE ImportQualifiedPost #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE OverloadedStrings   #-}
{-# LANGUAGE TemplateHaskell     #-}

module AirdropDistributor where

import qualified Plutus.V2.Ledger.Api      as PlutusV2
import           Plutus.V2.Ledger.Contexts (getContinuingOutputs)
import           PlutusTx                  (BuiltinData, compile, unstableMakeIsData,
                                            fromBuiltinData)
import           PlutusTx.Prelude          (Bool (True, False), Integer, BuiltinByteString,
                                            traceIfFalse, (==), (&&), ($), (>=),
                                            appendByteString, elem, not)
import           PlutusTx.Builtins         (blake2b_256, lessThanByteString)
import           Plutus.V1.Ledger.Value    (flattenValue, valueOf)
import           Prelude                   (IO)
import           Utilities                 (wrapValidator, writeValidatorToFile)

-- | The datum stores a Merkle root that commits to the full eligibility list
-- without putting all addresses on-chain. Also tracks who already claimed.

data AirdropDatum = AirdropDatum
    { merkleRoot      :: BuiltinByteString
    , airdropPolicyId :: PlutusV2.CurrencySymbol
    , airdropToken    :: PlutusV2.TokenName
    , claimedList     :: [PlutusV2.PubKeyHash]
    }
PlutusTx.unstableMakeIsData ''AirdropDatum

data MerkleDirection = L | R
PlutusTx.unstableMakeIsData ''MerkleDirection

data MerkleProofStep = MerkleProofStep
    { direction  :: MerkleDirection
    , proofHash  :: BuiltinByteString
    }
PlutusTx.unstableMakeIsData ''MerkleProofStep

data ClaimRedeemer = Claim
    { claimant      :: PlutusV2.PubKeyHash
    , claimAmount   :: Integer
    , merkleProof   :: [MerkleProofStep]
    }
PlutusTx.unstableMakeIsData ''ClaimRedeemer

{-# INLINABLE hashPair #-}
hashPair :: BuiltinByteString -> MerkleDirection -> BuiltinByteString -> BuiltinByteString
hashPair current L sibling = blake2b_256 (appendByteString sibling current)
hashPair current R sibling = blake2b_256 (appendByteString current sibling)

{-# INLINABLE verifyMerkleProof #-}
verifyMerkleProof :: BuiltinByteString -> [MerkleProofStep] -> BuiltinByteString -> Bool
verifyMerkleProof currentHash []         root = currentHash == root
verifyMerkleProof currentHash (step:rest) root =
    let nextHash = hashPair currentHash (direction step) (proofHash step)
    in verifyMerkleProof nextHash rest root

{-# INLINABLE mkAirdropValidator #-}
mkAirdropValidator :: AirdropDatum -> ClaimRedeemer -> PlutusV2.ScriptContext -> Bool
mkAirdropValidator dat (Claim claimer amount proof) ctx =
    traceIfFalse "Claimant must sign the transaction!" signedByClaimant &&
    traceIfFalse "This address already claimed!" notAlreadyClaimed &&
    traceIfFalse "Invalid Merkle proof!" proofIsValid &&
    traceIfFalse "Wrong token amount sent to claimant!" tokensDelivered &&
    traceIfFalse "Claimed list not updated!" stateUpdated
  where
    info :: PlutusV2.TxInfo
    info = PlutusV2.scriptContextTxInfo ctx

    signedByClaimant :: Bool
    signedByClaimant = PlutusV2.txSignedBy info claimer

    notAlreadyClaimed :: Bool
    notAlreadyClaimed = not (elem claimer (claimedList dat))

    leafHash :: BuiltinByteString
    leafHash = blake2b_256 (appendByteString 
                  (PlutusV2.getPubKeyHash claimer)
                  (PlutusV2.serialiseData (PlutusV2.toBuiltinData amount)))

    proofIsValid :: Bool
    proofIsValid = verifyMerkleProof leafHash proof (merkleRoot dat)

    tokensDelivered :: Bool
    tokensDelivered =
        let paidToClaimant = PlutusV2.valuePaidTo info claimer
        in valueOf paidToClaimant (airdropPolicyId dat) (airdropToken dat) >= amount

    stateUpdated :: Bool
    stateUpdated = case getContinuingOutputs ctx of
        [output] -> case PlutusV2.txOutDatum output of
            PlutusV2.OutputDatum (PlutusV2.Datum rawDatum) ->
                case fromBuiltinData rawDatum of
                    Just newDat ->
                        merkleRoot newDat == merkleRoot dat &&
                        elem claimer (claimedList newDat)
                    Nothing -> False
            _ -> False
        _ -> False

{-# INLINABLE wrappedMkVal #-}
wrappedMkVal :: BuiltinData -> BuiltinData -> BuiltinData -> ()
wrappedMkVal = wrapValidator mkAirdropValidator

validator :: PlutusV2.Validator
validator =
  PlutusV2.mkValidatorScript
    $$(PlutusTx.compile [|| wrappedMkVal ||])

saveVal :: IO ()
saveVal = writeValidatorToFile "./assets/airdrop.plutus" validator
`;

    const bashCommands = `# 1. Set up the airdrop — load tokens at the script with the Merkle root
$ cardano-cli conway transaction build \\
  --tx-in 90abcdef1234567890abcdef1234564a7b1c2d3e8f90a5b6c7d8e9f012345678#0 \\
  --tx-out $(cat airdrop.addr)+"5000000 + 1000000 airdrop_policy.AirdropToken" \\
  --tx-out-inline-datum-value '{"constructor":0,"fields":[{"bytes":"merkle_root_hash_abc123..."},{"bytes":"airdrop_policy_hex..."},{"bytes":"41697264726f70546f6b656e"},{"list":[]}]}' \\
  --change-address addr_test1apq77p56pdwtarlwcl7207wutxsnevh0c3xm0m64grhcehw4zfzp3 \\
  --testnet-magic 2 \\
  --out-file tx-setup-airdrop.raw

# ... sign and submit ...

-------------------------------------------------------------------------

# 2. User claims tokens with their Merkle proof
$ cardano-cli conway transaction build \\
  --tx-in cdef1234567890abcdef1234564a7b1c2d3e8f90a5b6c7d8e9f01234567890ab#0 \\
  --tx-in-script-file airdrop.plutus \\
  --tx-in-inline-datum-present \\
  --tx-in-redeemer-value '{"constructor":0,"fields":[{"bytes":"claimer_pkh_aaa..."},{"int":500},{"list":[{"constructor":0,"fields":[{"constructor":1,"fields":[]},{"bytes":"sibling_hash_1..."}]},{"constructor":0,"fields":[{"constructor":0,"fields":[]},{"bytes":"sibling_hash_2..."}]}]}]}' \\
  --tx-out addr_test1_claimer_address+"2000000 + 500 airdrop_policy.AirdropToken" \\
  --tx-out $(cat airdrop.addr)+"3000000 + 999500 airdrop_policy.AirdropToken" \\
  --tx-out-inline-datum-value '{"constructor":0,"fields":[{"bytes":"merkle_root_hash_abc123..."},{"bytes":"airdrop_policy_hex..."},{"bytes":"41697264726f70546f6b656e"},{"list":[{"bytes":"claimer_pkh_aaa..."}]}]}' \\
  --required-signer-hash claimer_pkh_aaa \\
  --tx-in-collateral 567890abcdef1234567890abcdef1234564a7b1c2d3e8f90a5b6c7d8e9f01234#0 \\
  --change-address addr_test1_claimer_address \\
  --testnet-magic 2 \\
  --out-file tx-claim-airdrop.raw

$ cardano-cli conway transaction sign \\
  --tx-body-file tx-claim-airdrop.raw \\
  --signing-key-file ../../../keys/claimer.skey \\
  --testnet-magic 2 \\
  --out-file tx-claim-airdrop.signed

$ cardano-cli conway transaction submit --tx-file tx-claim-airdrop.signed
`;

    return (
        <div className="article-content">
            <h2 id="introduction">Introduction</h2>

            <p>
                Token airdrops usually rely on a centralized server to control who's eligible.
                With Merkle trees, you can commit the entire eligibility list into a single
                32-byte hash and let users prove their own eligibility on-chain.
            </p>

            <p>
                The project owner builds a Merkle tree off-chain from all eligible addresses
                and their claim amounts, then stores only the root hash on-chain. Users
                submit a Merkle proof (a chain of sibling hashes) to demonstrate they were
                in the original list. The contract verifies the proof and sends the tokens.
            </p>

            <CodeBlock
                code={haskellCode}
                language="haskell"
                filename="AirdropDistributor.hs"
            />
            <br />

            <h2 id="explanation">Walkthrough</h2>

            <h3>Merkle proofs, briefly</h3>

            <p className="pexplaination">
                Say you have 1,000 eligible addresses. Instead of storing all 1,000 on-chain,
                you hash pairs of them together, then hash those results, and keep going until
                you get one root hash. To prove membership, a user provides ~10 sibling hashes
                (log₂ 1000 ≈ 10). The validator walks the proof from the leaf up to the root:
            </p>

            <CodeBlock
                code={`verifyMerkleProof currentHash [] root = currentHash == root
verifyMerkleProof currentHash (step:rest) root =
    let nextHash = hashPair currentHash (direction step) (proofHash step)
    in verifyMerkleProof nextHash rest root`}
                language="haskell"
                filename="Recursive Proof Walk"
            />

            <p className="pexplaination">
                At each step, hash the current value with the sibling in the correct order
                (left or right). If the final result matches the stored root, the proof
                is valid.
            </p>

            <h3>Double-claim prevention</h3>

            <p className="pexplaination pt-2">
                A valid Merkle proof never expires — same inputs always produce the same
                hashes. So the datum keeps a <code>claimedList</code> of addresses that
                already claimed. Before processing, the validator checks{" "}
                <code>not (elem claimer claimedList)</code>. After each claim, the
                claimant's PKH gets appended to the list in the continuing output.
            </p>

            <h3>Why the claimant must sign</h3>

            <p className="pexplaination pt-2">
                Merkle proofs are just data — anyone watching the mempool could see
                your proof and try to submit it themselves. The{" "}
                <code>txSignedBy</code> check prevents this. Even if someone copies
                your proof, they can't sign the transaction with your key.
            </p>

            <br />

            <h2 id="execution">Execution</h2>

            <p className="pexplaination">
                Admin loads tokens at the script with a Merkle root in the datum.
                Users self-serve their claims by building transactions with their proofs.
            </p>

            <CodeBlock
                code={bashCommands}
                language="bash"
                filename="Airdrop CLI Commands"
            />

            <h3>Practical limits</h3>

            <p className="pexplaination pt-2">
                The <code>claimedList</code> grows with every claim, increasing datum
                size and tx cost. For airdrops larger than a few thousand addresses,
                consider a bitmap or a claim-ticket NFT pattern instead. For most
                community-sized airdrops this approach works fine.
            </p>

        </div>
    );
}
