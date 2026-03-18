import CodeBlock from "@/components/layouts/CodeBlock";

export const articleMeta = {
    id: "airdrop-distributor",
    title: "Airdrop Distributor",
    subtitle: "Claim tokens by proving your address is in a Merkle tree — no trust, just cryptography",
    date: "2025-02-23T15:00:00.000Z",
    readTime: "9 min read",
    tags: ["plutus", "cardano", "tokens", "merkle-tree", "intermediate"],
    author: {
        name: "Aman Kumar",
        avatar: "https://i.pravatar.cc/48?img=19",
    },
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

---------------------------------------------------------------------------------------------------
----------------------------------- ON-CHAIN / VALIDATOR ------------------------------------------

-- The Datum holds the airdrop configuration. The Merkle root is a single hash
-- that cryptographically commits to the entire list of eligible addresses
-- and their claim amounts — without storing the full list on-chain.

data AirdropDatum = AirdropDatum
    { merkleRoot      :: BuiltinByteString         -- Root hash of the Merkle tree
    , airdropPolicyId :: PlutusV2.CurrencySymbol   -- Token being distributed
    , airdropToken    :: PlutusV2.TokenName         -- Token name to distribute
    , claimedList     :: [PlutusV2.PubKeyHash]     -- Addresses that already claimed
    }
PlutusTx.unstableMakeIsData ''AirdropDatum

-- A single node in the Merkle proof: goes either Left or Right in the tree
data MerkleDirection = L | R
PlutusTx.unstableMakeIsData ''MerkleDirection

data MerkleProofStep = MerkleProofStep
    { direction  :: MerkleDirection
    , proofHash  :: BuiltinByteString
    }
PlutusTx.unstableMakeIsData ''MerkleProofStep

-- The Redeemer carries the proof of eligibility
data ClaimRedeemer = Claim
    { claimant      :: PlutusV2.PubKeyHash
    , claimAmount   :: Integer
    , merkleProof   :: [MerkleProofStep]           -- Path from leaf to root
    }
PlutusTx.unstableMakeIsData ''ClaimRedeemer

-- Hash two byte strings in a canonical order for Merkle concatenation
{-# INLINABLE hashPair #-}
hashPair :: BuiltinByteString -> MerkleDirection -> BuiltinByteString -> BuiltinByteString
hashPair current L sibling = blake2b_256 (appendByteString sibling current)
hashPair current R sibling = blake2b_256 (appendByteString current sibling)

-- Walk the proof from the leaf hash up to the root
{-# INLINABLE verifyMerkleProof #-}
verifyMerkleProof :: BuiltinByteString -> [MerkleProofStep] -> BuiltinByteString -> Bool
verifyMerkleProof currentHash []         root = currentHash == root
verifyMerkleProof currentHash (step:rest) root =
    let nextHash = hashPair currentHash (direction step) (proofHash step)
    in verifyMerkleProof nextHash rest root

{-# INLINABLE mkAirdropValidator #-}
mkAirdropValidator :: AirdropDatum -> ClaimRedeemer -> PlutusV2.ScriptContext -> Bool
mkAirdropValidator dat (Claim claimer amount proof) ctx =
    -- The claimant must sign the transaction (prevents front-running)
    traceIfFalse "Claimant must sign the transaction!" signedByClaimant &&

    -- The claimant must not have already claimed
    traceIfFalse "This address already claimed!" notAlreadyClaimed &&

    -- The Merkle proof must be valid: hash(claimant ++ amount) → root
    traceIfFalse "Invalid Merkle proof!" proofIsValid &&

    -- The correct amount of tokens must be sent to the claimant
    traceIfFalse "Wrong token amount sent to claimant!" tokensDelivered &&

    -- The continuing output must have the claimer added to the claimed list
    traceIfFalse "Claimed list not updated!" stateUpdated
  where
    info :: PlutusV2.TxInfo
    info = PlutusV2.scriptContextTxInfo ctx

    signedByClaimant :: Bool
    signedByClaimant = PlutusV2.txSignedBy info claimer

    notAlreadyClaimed :: Bool
    notAlreadyClaimed = not (elem claimer (claimedList dat))

    -- Build the leaf hash from the claimant's address + their entitled amount
    leafHash :: BuiltinByteString
    leafHash = blake2b_256 (appendByteString 
                  (PlutusV2.getPubKeyHash claimer)
                  (PlutusV2.serialiseData (PlutusV2.toBuiltinData amount)))

    proofIsValid :: Bool
    proofIsValid = verifyMerkleProof leafHash proof (merkleRoot dat)

    -- Check that the airdrop tokens actually arrive at the claimant
    tokensDelivered :: Bool
    tokensDelivered =
        let paidToClaimant = PlutusV2.valuePaidTo info claimer
        in valueOf paidToClaimant (airdropPolicyId dat) (airdropToken dat) >= amount

    -- The continuing output must have claimer appended to the claimed list
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

---------------------------------------------------------------------------------------------------
------------------------------------- HELPER FUNCTIONS --------------------------------------------

saveVal :: IO ()
saveVal = writeValidatorToFile "./assets/airdrop.plutus" validator
`;

    const bashCommands = `# 1. Set up the Airdrop with the Merkle root and load tokens at the script
# The Merkle root commits to the entire list of eligible addresses + amounts
$ cardano-cli conway transaction build \\
  --tx-in dummy_tx_hash_uuid_here_1111111111111111#0 \\
  --tx-out $(cat airdrop.addr)+"5000000 + 1000000 airdrop_policy.AirdropToken" \\
  --tx-out-inline-datum-value '{"constructor":0,"fields":[{"bytes":"merkle_root_hash_abc123..."},{"bytes":"airdrop_policy_hex..."},{"bytes":"41697264726f70546f6b656e"},{"list":[]}]}' \\
  --change-address addr_test1_dummy_admin_address \\
  --testnet-magic 2 \\
  --out-file tx-setup-airdrop.raw

# ... sign and submit ...

-------------------------------------------------------------------------

# 2. User claims their tokens by providing a Merkle proof
# Redeemer: Claim {claimant: pkh, amount: 500, proof: [{dir: R, hash: "..."}, ...]}
$ cardano-cli conway transaction build \\
  --tx-in dummy_airdrop_utxo_hash_2222222222222222#0 \\
  --tx-in-script-file airdrop.plutus \\
  --tx-in-inline-datum-present \\
  --tx-in-redeemer-value '{"constructor":0,"fields":[{"bytes":"claimer_pkh_aaa..."},{"int":500},{"list":[{"constructor":0,"fields":[{"constructor":1,"fields":[]},{"bytes":"sibling_hash_1..."}]},{"constructor":0,"fields":[{"constructor":0,"fields":[]},{"bytes":"sibling_hash_2..."}]}]}]}' \\
  --tx-out addr_test1_claimer_address+"2000000 + 500 airdrop_policy.AirdropToken" \\
  --tx-out $(cat airdrop.addr)+"3000000 + 999500 airdrop_policy.AirdropToken" \\
  --tx-out-inline-datum-value '{"constructor":0,"fields":[{"bytes":"merkle_root_hash_abc123..."},{"bytes":"airdrop_policy_hex..."},{"bytes":"41697264726f70546f6b656e"},{"list":[{"bytes":"claimer_pkh_aaa..."}]}]}' \\
  --required-signer-hash claimer_pkh_aaa \\
  --tx-in-collateral dummy_collateral_hash_uuid_here_3333#0 \\
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
                Airdrops are one of the most common token distribution methods in crypto.
                But traditional airdrops often require a centralized server to decide who's
                eligible. What if you could commit to the entire eligibility list using a{" "}
                <em>single 32-byte hash</em>, and let users prove their own eligibility
                on-chain?
            </p>

            <p>
                The <strong>Airdrop Distributor</strong> uses a <strong>Merkle tree</strong>
                {" "}— the same data structure that secures Bitcoin blocks. The project owner
                builds a tree of all eligible addresses and their claim amounts, hashes it
                down to a single root, and stores that root on-chain. When a user wants to
                claim, they submit a "proof" (a chain of hashes) that demonstrates their
                address was in the original list, without the contract needing to store
                the entire list.
            </p>

            <CodeBlock
                code={haskellCode}
                language="haskell"
                filename="AirdropDistributor.hs"
            />
            <br />

            <h2 id="explanation">How It Really Works</h2>

            <h3>Merkle Proofs in 60 Seconds</h3>

            <p className="pexplaination">
                Imagine you have 1,000 eligible addresses. Instead of storing all 1,000
                on-chain (expensive!), you pair them up and hash each pair. Then you pair
                those hashes and hash again, continuing until you have a single hash — the
                Merkle root. To prove you're in the tree, you only need ~10 sibling hashes
                (log₂ 1000 ≈ 10), not all 1,000 addresses.
            </p>

            <CodeBlock
                code={`verifyMerkleProof currentHash [] root = currentHash == root
verifyMerkleProof currentHash (step:rest) root =
    let nextHash = hashPair currentHash (direction step) (proofHash step)
    in verifyMerkleProof nextHash rest root`}
                language="haskell"
                filename="Recursive Proof Verification"
            />

            <p className="pexplaination">
                The proof is a list of steps. At each step, the validator hashes the current
                value with the sibling (left or right), producing the parent hash. This walks
                up the tree level by level. If the final result matches the root stored in
                the datum, the proof is valid — the address is genuinely in the list.
            </p>

            <h3>Anti-Double-Claim</h3>

            <p className="pexplaination pt-2">
                A valid Merkle proof never expires. So what prevents someone from claiming
                twice? The <code>claimedList</code> in the datum! After each successful
                claim, the claimant's <code>PubKeyHash</code> is appended to the list.
                Before processing any claim, the validator checks{" "}
                <code>not (elem claimer claimedList)</code>. If you're already on the
                list, the transaction is dead on arrival.
            </p>

            <h3>Front-Running Protection</h3>

            <p className="pexplaination pt-2">
                Merkle proofs are public data — anyone watching the mempool could see
                your proof and try to claim your tokens. That's why the validator requires{" "}
                <code>txSignedBy</code> from the actual claimant. Even if a miner sees
                your proof, they can't use it without your private key.
            </p>

            <br />

            <h2 id="execution">Execution Lifecycle</h2>

            <p className="pexplaination">
                The admin sets up the airdrop by locking the tokens at the script address
                with the Merkle root in the datum. Users then self-serve their claims
                by submitting transactions with their proofs.
            </p>

            <CodeBlock
                code={bashCommands}
                language="bash"
                filename="Airdrop CLI Commands"
            />

            <h3>Scaling Considerations</h3>

            <p className="pexplaination pt-2">
                The <code>claimedList</code> grows with each claim, which increases the
                datum size and transaction cost over time. For very large airdrops (10,000+
                addresses), a production system might use a bitmap or a separate claim-ticket
                NFT pattern instead. But for most community airdrops, this approach is
                simple, secure, and cost-effective.
            </p>

        </div>
    );
}
