import CodeBlock from "@/components/layouts/CodeBlock";

export const articleMeta = {
    id: "collateralloan",
    title: "Overcollateralized Loan",
    subtitle: "A DeFi primitive: lock your precious NFTs or tokens to borrow ADA. If you don't pay it back in time, you lose the collateral.",
    date: "2025-02-23T20:00:00.000Z",
    readTime: "12 min read",
    tags: ["plutus", "cardano", "defi", "lending", "intermediate"],
    author: {
        name: "Aman Kumar",
        avatar: "https://i.pravatar.cc/48?img=21",
    },
};

export default function CollateralLoanArticle() {
    const haskellCode = `{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE ImportQualifiedPost #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE OverloadedStrings   #-}
{-# LANGUAGE TemplateHaskell     #-}

module CollateralLoan where

import qualified Plutus.V2.Ledger.Api as PlutusV2
import           PlutusTx             (BuiltinData, compile, unstableMakeIsData)
import           PlutusTx.Prelude     (Bool, traceIfFalse, (&&), ($), (+), (==), (>=), Integer)
import           Plutus.V1.Ledger.Value (valueOf)
import           Plutus.V1.Ledger.Interval (from, to, contains)
import           Prelude              (IO)
import           Utilities            (wrapValidator, writeValidatorToFile)

---------------------------------------------------------------------------------------------------
----------------------------------- ON-CHAIN / VALIDATOR ------------------------------------------

-- The datum holds the terms of the loan contract.
-- It records who lent the ADA, who borrowed it, the repayment price, and the deadline.
data LoanDatum = LoanDatum
    { lender         :: PlutusV2.PubKeyHash -- The guy who holds the debt (and gets paid)
    , borrower       :: PlutusV2.PubKeyHash -- The guy who locked collateral here
    , repaymentAmt   :: Integer             -- How much ADA must be paid back to unlock the collateral
    , deadlineSlot   :: PlutusV2.POSIXTime  -- The point of no return for liquidation
    }
PlutusTx.unstableMakeIsData ''LoanDatum

-- There are two ways the collateral sitting in this UTxO can be touched:
-- 1. The borrower pays back the loan (Repay).
-- 2. The borrower defaults, and the lender seizes the assets (Liquidate).
data LoanAction = Repay | Liquidate
PlutusTx.unstableMakeIsData ''LoanAction

{-# INLINABLE mkLoanValidator #-}
mkLoanValidator :: LoanDatum -> LoanAction -> PlutusV2.ScriptContext -> Bool
mkLoanValidator dat action ctx = case action of

    Repay ->
        -- Borrower is paying it back.
        traceIfFalse "Only the borrower can trigger Repay!" (signedBy $ borrower dat) &&
        -- Is the lender actually receiving their ADA?
        traceIfFalse "The lender did not receive the required repayment!" lenderPaid &&
        -- Has the deadline passed? If so, it's too late to repay.
        traceIfFalse "The loan has already expired!" beforeDeadline

    Liquidate ->
        -- The borrower failed. The lender is seizing the assets.
        traceIfFalse "Only the lender can trigger Liquidate!" (signedBy $ lender dat) &&
        -- Did the deadline actually pass? We can't let lenders steal collateral early.
        traceIfFalse "The loan hasn't expired yet!" afterDeadline

  where
    info :: PlutusV2.TxInfo
    info = PlutusV2.scriptContextTxInfo ctx

    signedBy :: PlutusV2.PubKeyHash -> Bool
    signedBy pkh = PlutusV2.txSignedBy info pkh

    -- Check if the exact repayment amount (in Lovelace) arrived at the lender's wallet.
    lenderPaid :: Bool
    lenderPaid =
        let
            lenderOutputs = [ o | o <- PlutusV2.txInfoOutputs info 
                                , PlutusV2.txOutAddress o == PlutusV2.pubKeyHashAddress (lender dat) ]
            
            totalPaid = sum [ valueOf (PlutusV2.txOutValue o) PlutusV2.adaSymbol PlutusV2.adaToken | o <- lenderOutputs ]
        in
            totalPaid >= repaymentAmt dat

    -- Time validation: Is the entire execution range strictly containing the time BEFORE the deadline?
    beforeDeadline :: Bool
    beforeDeadline = contains (to $ deadlineSlot dat) (PlutusV2.txInfoValidRange info)

    -- Time validation: Is the entire execution range strictly containing the time AFTER the deadline?
    afterDeadline :: Bool
    afterDeadline = contains (from $ deadlineSlot dat) (PlutusV2.txInfoValidRange info)

{-# INLINABLE wrappedMkVal #-}
wrappedMkVal :: BuiltinData -> BuiltinData -> BuiltinData -> ()
wrappedMkVal = wrapValidator mkLoanValidator

validator :: PlutusV2.Validator
validator =
  PlutusV2.mkValidatorScript
    $$(PlutusTx.compile [|| wrappedMkVal ||])

---------------------------------------------------------------------------------------------------
------------------------------------- HELPER FUNCTIONS --------------------------------------------

saveVal :: IO ()
saveVal = writeValidatorToFile "./assets/collateralloan.plutus" validator
`;

    const bashCommands = `# Scenario: I want to borrow 5,000 ADA. I have a rare "SpaceBudz" NFT.
# The lender agrees: I must repay 5,200 ADA (+4% interest) by March 1, 2025.
# If I fail, they keep the SpaceBudz NFT.

# (Assuming the NFT is already locked in the script with the required Datum)

# -------------------------------------------------------------------------
# 1. The Happy Path: Repayment
# I (the borrower) have the 5,200 ADA. I want my NFT back.

$ cardano-cli conway transaction build \\
  --tx-in f29c7d41ef993a40879c882bc283a00508a8e10d291b8d234bd35a0928a6fcf4#0 \\
  --tx-in-script-file collateralloan.plutus \\
  --tx-in-inline-datum-present \\
  --tx-in-redeemer-value '{"constructor":0,"fields":[]}' \\
  --required-signer-hash 8b7c6d5e4f3a2b1... \\
  --tx-in-collateral d83b72c91a4bc5e1a908a80bdff62ea9825b4df2798aa12365e098a7213baf#0 \\
  --tx-out $(cat lender.addr)+5200000000 \\
  --tx-out $(cat borrower.addr)+2000000+"1 d5e6f7a8b9c0...SpaceBudz712" \\
  --invalid-hereafter 1740787200 \\
  --change-address $(cat borrower.addr) \\
  --testnet-magic 2 \\
  --out-file tx-repay.raw

$ cardano-cli conway transaction sign --tx-body-file tx-repay.raw --signing-key-file borrower.skey --testnet-magic 2 --out-file tx-repay.signed
$ cardano-cli conway transaction submit --tx-file tx-repay.signed

# -------------------------------------------------------------------------
# 2. The Unfortunate Path: Liquidation
# I totally forgot to pay it back. March 2nd rolls around. The lender takes my SpaceBudz.

$ cardano-cli conway transaction build \\
  --tx-in f29c7d41ef993a40879c882bc283a00508a8e10d291b8d234bd35a0928a6fcf4#0 \\
  --tx-in-script-file collateralloan.plutus \\
  --tx-in-inline-datum-present \\
  --tx-in-redeemer-value '{"constructor":1,"fields":[]}' \\
  --required-signer-hash 1a2b3c4d5e6f7... \\
  --tx-in-collateral a1b2c3d4e5f6a7...#0 \\
  --tx-out $(cat lender.addr)+2000000+"1 d5e6f7a8b9c0...SpaceBudz712" \\
  --invalid-before 1740787200 \\
  --change-address $(cat lender.addr) \\
  --testnet-magic 2 \\
  --out-file tx-liquidate.raw

$ cardano-cli conway transaction sign --tx-body-file tx-liquidate.raw --signing-key-file lender.skey --testnet-magic 2 --out-file tx-liquidate.signed
$ cardano-cli conway transaction submit --tx-file tx-liquidate.signed
`;

    return (
        <div className="article-content">
            <h2 id="introduction">Introduction</h2>

            <p>
                In the legacy financial system, if you want a loan, you walk into a bank, fill out thirty pages of paperwork, let them run your credit score, and hand over the deed to your house. If you don't pay them back, lawyers get involved.
            </p>

            <p>
                In decentralized finance (DeFi), trust is replaced by mathematics. If you want a loan, you take a highly valuable digital asset (like an NFT or a massive stack of native tokens) and you lock it inside a transparent, impartial smart contract. You set the terms in stone: <i>"I owe you X amount of ADA by Y date. If I don't pay you back in time, the contract will automatically let you seize my asset."</i>
            </p>

            <CodeBlock
                code={haskellCode}
                language="haskell"
                filename="CollateralLoan.hs"
            />
            <br />

            <h2 id="explanation">The Logic of Lending</h2>

            <h3>The Golden Rule of Smart Contracts</h3>

            <p className="pexplaination">
                This contract illustrates one of the golden rules of writing Plutus code: <strong>Validators don't force actions to happen; they only prevent illegal actions from happening.</strong>
            </p>

            <p className="pexplaination pt-2">
                When the deadline hits, the contract doesn't suddenly wake up, pull the NFT out of the UTxO, and airdrop it into the lender's wallet. The blockchain is entirely passive. Instead, the contract merely unlocks a new *theoretical possibility*. Once the <code>deadlineSlot</code> passes, the <code>Liquidate</code> branch of code evaluates to <code>True</code>. It is now up to the lender to actively construct a transaction claiming that NFT.
            </p>

            <h3>The Asymmetry of Time bounds</h3>

            <p className="pexplaination pt-2">
                Look closely at the two completely opposing time constraints used in this loan.
            </p>

            <CodeBlock
                code={`-- Borrower's Repayment Constraint
beforeDeadline = contains (to $ deadlineSlot dat) (PlutusV2.txInfoValidRange info)

-- Lender's Liquidation Constraint
afterDeadline = contains (from $ deadlineSlot dat) (PlutusV2.txInfoValidRange info)`}
                language="haskell"
                filename=" Opposing Time Locks"
            />

            <p className="pexplaination pt-2">
                When the borrower tries to repay the loan and unlock their NFT, they must use <code>--invalid-hereafter</code> on the CLI. The network verifies that the transaction executes firmly <strong>before</strong> the deadline. 
            </p>

            <p className="pexplaination">
                Conversely, when the lender comes to aggressively liquidate the collateral, they must use <code>--invalid-before</code>. They have to cryptographically prove that the deadline is sitting in their rearview mirror. Without these overlapping but completely mutually exclusive checks, the lender could arbitrarily liquidate the borrower on day one, stealing the collateral without giving them a chance to pay it back.
            </p>

            <br />

            <h2 id="execution">Execution Lifecycle</h2>

            <p className="pexplaination">
                Here are the two vastly different transaction structures. The first is the borrower returning to claim their prized SpaceBudz NFT. The second is the savage reality of DeFi liquidations when the borrower misses the deadline.
            </p>

            <CodeBlock
                code={bashCommands}
                language="bash"
                filename="Collateral Loan CLI Commands"
            />

        </div>
    );
}
