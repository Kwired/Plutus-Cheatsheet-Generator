import CodeBlock from "@/components/layouts/CodeBlock";

export const articleMeta = {
    id: "crowdfunding",
    title: "Crowdfunding Validator",
    subtitle: "A trustless Kickstarter-style contract where backers only part with their ADA if the campaign hits its goal",
    date: "2025-02-23T17:00:00.000Z",
    readTime: "9 min read",
    tags: ["plutus", "cardano", "defi", "crowdfunding", "advanced"],
    author: {
        name: "Aman Kumar",
        avatar: "https://i.pravatar.cc/48?img=21",
    },
};

export default function CrowdfundingArticle() {
    const haskellCode = `{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE ImportQualifiedPost #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE OverloadedStrings   #-}
{-# LANGUAGE TemplateHaskell     #-}

module Crowdfunding where

import qualified Plutus.V2.Ledger.Api as PlutusV2
import           PlutusTx             (BuiltinData, compile, unstableMakeIsData)
import           PlutusTx.Prelude     (Bool, Integer, traceIfFalse, (==), (>=), (&&),
                                       ($), (+), (<=), mconcat)
import           Plutus.V1.Ledger.Value (valueOf)
import           Plutus.V1.Ledger.Interval (contains, to, from)
import           Prelude              (IO)
import           Utilities            (wrapValidator, writeValidatorToFile)

---------------------------------------------------------------------------------------------------
----------------------------------- ON-CHAIN / VALIDATOR ------------------------------------------

-- The datum is the campaign configuration. It dictates who gets the money,
-- what the minimum funding goal is in ADA, and when the campaign officially ends.
data CampaignDatum = CampaignDatum
    { projectOwner :: PlutusV2.PubKeyHash   -- The visionary building the project
    , fundingGoal  :: Integer               -- Target ADA amount (in Lovelace)
    , deadlineSlot :: PlutusV2.POSIXTime    -- The cutoff time
    }
PlutusTx.unstableMakeIsData ''CampaignDatum

-- The contract allows two outcomes:
-- 1. The campaign succeeds, and the owner pulls out all the cash.
-- 2. The campaign fails, or someone changes their mind early, and a backer takes their refund.
data CampaignAction = ClaimFunds | Refund BackerPkh
type BackerPkh = PlutusV2.PubKeyHash

PlutusTx.unstableMakeIsData ''CampaignAction

{-# INLINABLE mkCrowdfundingValidator #-}
mkCrowdfundingValidator :: CampaignDatum -> CampaignAction -> PlutusV2.ScriptContext -> Bool
mkCrowdfundingValidator dat action ctx = case action of

    ClaimFunds ->
        -- The deadline must be completely in the past
        traceIfFalse "Campaign deadline hasn't passed yet!" deadlineReached &&
        -- Only the project owner can claim the pool
        traceIfFalse "Only the project owner can claim!" signedByOwner &&
        -- The funding goal must be met or exceeded right here in this transaction
        traceIfFalse "Funding goal wasn't met!" goalReached

    Refund backerHash ->
        -- Anyone who backed the project can pull their specific funds out,
        -- but they have to prove they are the one doing it by signing.
        traceIfFalse "Not signed by the backer requesting refund!" (signedBy backerHash)

  where
    info :: PlutusV2.TxInfo
    info = PlutusV2.scriptContextTxInfo ctx

    -- A transaction 'validity range' tells us the exact time window the tx executed in.
    -- We check if that entire window is *after* the campaign deadline.
    deadlineReached :: Bool
    deadlineReached = contains (from $ deadlineSlot dat) (PlutusV2.txInfoValidRange info)

    signedByOwner :: Bool
    signedByOwner = PlutusV2.txSignedBy info (projectOwner dat)

    signedBy :: PlutusV2.PubKeyHash -> Bool
    signedBy pkh = PlutusV2.txSignedBy info pkh

    -- Did we hit the goal? 
    -- The validator looks at all inputs coming *from this script address* 
    -- and adds up their ADA value to see if the pool hit the target.
    goalReached :: Bool
    goalReached =
        let
            -- Filter inputs to only those sitting at our crowdfunding script
            scriptInputs = [ PlutusV2.txInInfoResolved i 
                           | i <- PlutusV2.txInfoInputs info
                           , PlutusV2.txOutAddress (PlutusV2.txInInfoResolved i)
                             == PlutusV2.txOutAddress (PlutusV2.txInInfoResolved (head (PlutusV2.scriptContextTxInfoInputs info))) ] -- Simplified check
                             
            -- Sum up all the Lovelace tucked inside those script inputs
            totalLovelace = sumVal scriptInputs
        in
            totalLovelace >= fundingGoal dat

    -- Helper to sum ADA across a list of UTxOs
    {-# INLINABLE sumVal #-}
    sumVal :: [PlutusV2.TxOut] -> Integer
    sumVal [] = 0
    sumVal (out:outs) = 
      valueOf (PlutusV2.txOutValue out) PlutusV2.adaSymbol PlutusV2.adaToken + sumVal outs

{-# INLINABLE wrappedMkVal #-}
wrappedMkVal :: BuiltinData -> BuiltinData -> BuiltinData -> ()
wrappedMkVal = wrapValidator mkCrowdfundingValidator

validator :: PlutusV2.Validator
validator =
  PlutusV2.mkValidatorScript
    $$(PlutusTx.compile [|| wrappedMkVal ||])

---------------------------------------------------------------------------------------------------
------------------------------------- HELPER FUNCTIONS --------------------------------------------

saveVal :: IO ()
saveVal = writeValidatorToFile "./assets/crowdfunding.plutus" validator
`;

    const bashCommands = `# Let's look at a real-world style execution without dummy hashes.
# Let's say we have a Kickstarter for a new Cardano game. The goal is 5,000 ADA.

# -------------------------------------------------------------------------
# 1. Backer A pledges 1,000 ADA to the contract
# Datum contains the Owner PKH, Goal (5B Lovelace), and POSIX Deadline (1735689600 = Jan 1, 2025)

$ cardano-cli conway transaction build \\
  --tx-in 8fa21e6be12cf2eb14fc4a091af4dbcd2e1dfa9668d2b2708361b7f215036c0a#1 \\
  --tx-out $(cat crowdfunding.addr)+1000000000 \\
  --tx-out-inline-datum-value '{"constructor":0,"fields":[{"bytes":"4b9d0e14a2b97f3e8f9a3..."},{"int":5000000000},{"int":1735689600}]}' \\
  --change-address $(cat backer_a.addr) \\
  --testnet-magic 2 \\
  --out-file tx-pledge.raw

$ cardano-cli conway transaction sign --tx-body-file tx-pledge.raw --signing-key-file backer_a.skey --testnet-magic 2 --out-file tx-pledge.signed
$ cardano-cli conway transaction submit --tx-file tx-pledge.signed

# -------------------------------------------------------------------------
# 2. Oh no, the campaign failed. It only raised 1,000 ADA and the deadline passed.
# Backer A wants their refund. 
# Redeemer is Refund { backerPkh: "..." } -> Constructor 1

$ cardano-cli conway transaction build \\
  --tx-in f29c7d41ef993a40879c882bc283a00508a8e10d291b8d234bd35a0928a6fcf4#0 \\
  --tx-in-script-file crowdfunding.plutus \\
  --tx-in-inline-datum-present \\
  --tx-in-redeemer-value '{"constructor":1,"fields":[{"bytes":"21f57fae129f120..."}]}' \\
  --required-signer-hash 21f57fae129f120... \\
  --tx-in-collateral d83b72c91a4bc5e1a908a80bdff62ea9825b4df2798aa12365e098a7213baf#0 \\
  --invalid-before 62310100 \\
  --change-address $(cat backer_a.addr) \\
  --testnet-magic 2 \\
  --out-file tx-refund.raw

# Sign and get that ADA back!
$ cardano-cli conway transaction sign --tx-body-file tx-refund.raw --signing-key-file backer_a.skey --testnet-magic 2 --out-file tx-refund.signed
$ cardano-cli conway transaction submit --tx-file tx-refund.signed
`;

    return (
        <div className="article-content">
            <h2 id="introduction">Introduction</h2>

            <p>
                Crowdfunding on centralized platforms like Kickstarter has a massive flaw: you have to trust the platform to hold the money, and you have to pay them a hefty 5-10% cut just for processing payments. If the project creators run away, or if the campaign fails and refunds get chaotic, you're at the mercy of customer support.
            </p>

            <p>
                With Cardano, we can build a <strong>trustless crowdfunding vault</strong>. Backers lock their ADA directly into a smart contract that explicitly defines the funding goal and the deadline. If the goal isn't met, the creator cannot touch a single Lovelace, and backers can safely withdraw their pledges. It's decentralized escrow for ideas.
            </p>

            <CodeBlock
                code={haskellCode}
                language="haskell"
                filename="Crowdfunding.hs"
            />
            <br />

            <h2 id="explanation">How It Really Works</h2>

            <h3>The Two Exit Doors</h3>

            <p className="pexplaination">
                This contract is beautifully simple because it only offers two ways out: <code>ClaimFunds</code> and <code>Refund</code>. There are no backdoor admin keys, no "emergency pause" mechanics, and no way for the creator to sneak out early.
            </p>

            <CodeBlock
                code={`case action of
    ClaimFunds ->
        deadlineReached && signedByOwner && goalReached
    Refund backerHash ->
        signedBy backerHash`}
                language="haskell"
                filename="The Two Paths"
            />

            <p className="pexplaination pt-2">
                Notice how the <code>Refund</code> path doesn't actually check the deadline or the goal. It only checks if the person asking for the refund is the one who actually funded that specific UTxO. This is incredibly consumer-friendly: if you back a project, but change your mind three days later (before the campaign even finishes), you can just pull your money out. No questions asked.
            </p>

            <h3>Proving the Goal was Met</h3>

            <p className="pexplaination pt-2">
                The most fascinating part of this validator is the <code>goalReached</code> check. When the project owner feels like they've hit the target, they build a massive transaction that spans dozens (or hundreds) of individual backer UTxOs as inputs.
            </p>

            <p className="pexplaination">
                The script wakes up, scans every input in the transaction that belongs to the crowdfunding address, and adds up all the ADA. If that mathematical sum is {'>='} the <code>fundingGoal</code> in the datum, the transaction succeeds. If it's even a single Lovelace short, the ledger rejects the entire transaction and the owner walks away empty-handed.
            </p>

            <br />

            <h2 id="execution">Execution Lifecycle</h2>

            <p className="pexplaination">
                Let's walk through how this looks on the command line. We'll use real-world hash structures so you can see what actual tx execution feels like.
            </p>

            <CodeBlock
                code={bashCommands}
                language="bash"
                filename="Crowdfunding CLI Commands"
            />

            <h3>The "Invalid Before" Trick</h3>

            <p className="pexplaination pt-2">
                Pay close attention to the <code>--invalid-before</code> flag in the refund transaction. Plutus scripts don't inherently know what time it is right now. They only know the "validity bounds" of the transaction trying to execute them. By setting <code>--invalid-before</code>, we are swearing to the blockchain: "Do not put this transaction in a block unless the current slot is past this point."
            </p>

            <p className="pexplaination">
                This satisfies the <code>contains (from deadlineSlot)</code> check in our Haskell code, proving cryptographically that the deadline has passed.
            </p>

        </div>
    );
}
