import CodeBlock from "@/components/layouts/CodeBlock";

export const articleMeta = {
    id: "bounty-board",
    title: "Cryptographic Bounty Board",
    subtitle: "A smart contract that locks ADA and automatically pays out to anyone submitting a valid cryptographic proof",
    date: new Date().toISOString(),
    readTime: "7 min read",
    tags: ["plutus", "cardano", "bounty", "cryptography", "advanced"],
    author: {
        name: "Aman Kumar",
        avatar: "https://i.pravatar.cc/48?img=16",
    },
    plutusVersion: "V2",
    complexity: "Advanced",
    useCase: "Cryptography",
};

export default function BountyBoardArticle() {
    const haskellCode = `{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE ImportQualifiedPost #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE OverloadedStrings   #-}
{-# LANGUAGE TemplateHaskell     #-}

module BountyBoard where

import qualified Plutus.V2.Ledger.Api      as PlutusV2
import           PlutusTx                  (BuiltinData, compile, unstableMakeIsData)
import           PlutusTx.Prelude          (Bool (False), traceIfFalse,
                                            (==), (&&), ($), BuiltinByteString)
import           PlutusTx.Builtins         (blake2b_256)
import           Plutus.V1.Ledger.Value    (valueOf)
import           Prelude                   (IO)
import           Utilities                 (wrapValidator, writeValidatorToFile)

---------------------------------------------------------------------------------------------------
----------------------------------- ON-CHAIN / VALIDATOR ------------------------------------------

-- | The Datum defines the conditions of the bounty
data BountyDatum = BountyDatum
    { bdSponsor     :: PlutusV2.PubKeyHash -- The entity funding the bounty
    , bdTargetHash  :: BuiltinByteString   -- The hash of the correct answer
    , bdBountyAmt   :: Integer             -- The Lovelace reward locked
    }
PlutusTx.unstableMakeIsData ''BountyDatum

-- | The Redeemer is the proof or solution provided by the bounty hunter
data BountyAction = Claim BuiltinByteString | Refund
PlutusTx.unstableMakeIsData ''BountyAction

{-# INLINABLE mkBountyValidator #-}
mkBountyValidator :: BountyDatum -> BountyAction -> PlutusV2.ScriptContext -> Bool
mkBountyValidator dat action ctx =
    case action of
        Claim solution ->
            traceIfFalse "Incorrect solution provided!" (verifySolution solution)
            -- Note: We don't need to specify *who* gets paid, because if the Plutus
            -- script returns True, the transaction executes and the UTxO is consumed.
            -- Whoever builds the transaction (the hunter) simply routes the bounty to themselves.

        Refund ->
            traceIfFalse "Only the sponsor can refund the bounty!" sponsorSigned &&
            traceIfFalse "Sponsor did not receive their refund!" sponsorRefunded
  where
    info :: PlutusV2.TxInfo
    info = PlutusV2.scriptContextTxInfo ctx

    -- Verify the hunter's solution
    verifySolution :: BuiltinByteString -> Bool
    verifySolution sol = blake2b_256 sol == bdTargetHash dat

    -- Verify Refund Conditions
    sponsorSigned :: Bool
    sponsorSigned = PlutusV2.txSignedBy info (bdSponsor dat)

    sponsorRefunded :: Bool
    sponsorRefunded =
        let paidToSponsor = PlutusV2.valuePaidTo info (bdSponsor dat)
        in valueOf paidToSponsor PlutusV2.adaSymbol PlutusV2.adaToken >= bdBountyAmt dat

{-# INLINABLE wrappedVal #-}
wrappedVal :: BuiltinData -> BuiltinData -> BuiltinData -> ()
wrappedVal p = wrapValidator mkBountyValidator

validator :: PlutusV2.Validator
validator =
    PlutusV2.mkValidatorScript
        $$(PlutusTx.compile [|| wrappedVal ||])
`;

    const bashCommands = `# 1. POST THE BOUNTY
# A sponsor locks 1,000 ADA for whoever can guess the preimage of the Target Hash
$ cardano-cli conway transaction build \\
  --tx-in dummy_sponsor_utxo_1111#0 \\
  --tx-out $(cat bounty.addr)+1000000000 \\
  --tx-out-inline-datum-value '{"constructor":0,"fields":[{"bytes":"sponsor_pkh_..."},{"bytes":"TARGET_HASH_AABBCC..."},{"int":1000000000}]}' \\
  --change-address addr_test1_sponsor... \\
  --testnet-magic 2 \\
  --out-file tx-post-bounty.raw

# ... sign and submit ...

-------------------------------------------------------------------------

# 2. CLAIM THE BOUNTY
# The hunter finds the answer ("satoshi" in hex) and submits it in the clear as the Redeemer.
$ cardano-cli conway transaction build \\
  --tx-in dummy_bounty_utxo_2222#0 \\
  --tx-in-script-file bounty.plutus \\
  --tx-in-inline-datum-present \\
  --tx-in-redeemer-value '{"constructor":0,"fields":[{"bytes":"7361746f736869"}]}' \\
  --tx-in dummy_hunter_fee_utxo_3333#0 \\
  --tx-out addr_test1_hunter...+1000000000 \\
  --tx-in-collateral dummy_hunter_collateral_utxo_4444#0 \\
  --change-address addr_test1_hunter... \\
  --testnet-magic 2 \\
  --out-file tx-claim-bounty.raw

# ... sign and submit ...
`;

    return (
        <div className="article-content">
            <h2 id="introduction">Introduction</h2>

            <p>
                A <strong>Cryptographic Bounty Board</strong> is a contract that holds ADA at a script address and pays it out to whoever submits a valid preimage for a stored hash. The sponsor picks a secret, hashes it, and locks the reward on-chain. First person to reverse the hash gets the funds.
            </p>

            <p>
                You see this pattern in bug bounties, puzzle competitions, and some ZK proof constructions. Once deployed, the payout is automated—the sponsor can't block a valid claim. They do have a refund path if they want to pull the bounty before it's solved.
            </p>

            <CodeBlock
                code={haskellCode}
                language="haskell"
                filename="BountyBoard.hs"
            />
            <br />

            <h2 id="explanation">How the Payout Works</h2>

            <h3>Permissionless Execution</h3>

            <p className="pexplaination">
                Look at the <code>Claim</code> branch. There's no signature check on the claimant and no constraint on where the output goes. The only thing it validates is the solution hash.
            </p>

            <p className="pexplaination pt-2">
                Single rule: <code>traceIfFalse "Incorrect solution provided!" (verifySolution solution)</code>
            </p>

            <ul className="text-gray-300 list-disc ml-8 pt-2">
                <li className="mb-2">This works because of how eUTxO operates—when the validator returns <code>True</code>, the UTxO is consumed. The person building the transaction controls the outputs, so the solver just routes the ADA to their own address.</li>
                <li className="mb-2">No separate payout logic needed. The transaction builder decides where funds go.</li>
            </ul>

            <h3>Front-Running Risk</h3>

            <p className="pexplaination pt-2">
                There's a practical problem with this design: <strong>front-running</strong>.
            </p>

            <p className="pexplaination pt-2">
                When you submit a claim, the solution is in the Redeemer as plaintext. Before the transaction lands in a block, it sits in the mempool where anyone can see it.
            </p>

            <p className="pexplaination pt-2">
                MEV bots monitor the mempool for exactly this kind of opportunity. A bot can extract your solution, build a competing transaction that routes the funds to its own wallet, and attach a higher fee to get priority. The standard fix is a two-step <strong>Commit-Reveal Scheme</strong>, which the Sealed-Bid Auction contract in this project demonstrates.
            </p>            

            <br />

            <h2 id="execution">Running the Code</h2>

            <p className="pexplaination">
                Posting a bounty means locking ADA at the script address with a datum containing the target hash. Claiming requires providing the preimage in the redeemer.
            </p>

            <CodeBlock
                code={bashCommands}
                language="bash"
                filename="Bounty CLI Commands"
            />

        </div>
    );
}
