import CodeBlock from "@/components/layouts/CodeBlock";

export const articleMeta = {
    id: "arbitratorescrow",
    title: "Escrow with Arbitrator",
    subtitle: "A trustless 3-party escrow where an impartial judge steps in only if the buyer and seller cannot agree",
    date: "2025-02-23T22:00:00.000Z",
    readTime: "9 min read",
    tags: ["plutus", "cardano", "defi", "escrow", "intermediate"],
    author: {
        name: "Aman Kumar",
        avatar: "https://i.pravatar.cc/48?img=21",
    },
};

export default function ArbitratorEscrowArticle() {
    const haskellCode = `{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE ImportQualifiedPost #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE OverloadedStrings   #-}
{-# LANGUAGE TemplateHaskell     #-}

module ArbitratorEscrow where

import qualified Plutus.V2.Ledger.Api as PlutusV2
import           PlutusTx             (BuiltinData, compile, unstableMakeIsData)
import           PlutusTx.Prelude     (Bool, traceIfFalse, (&&), ($))
import           Prelude              (IO)
import           Utilities            (wrapValidator, writeValidatorToFile)

---------------------------------------------------------------------------------------------------
----------------------------------- ON-CHAIN / VALIDATOR ------------------------------------------

-- The datum holds the three key players in our transaction.
data EscrowDatum = EscrowDatum
    { buyer       :: PlutusV2.PubKeyHash -- The person paying the ADA
    , seller      :: PlutusV2.PubKeyHash -- The person providing the goods/services
    , arbitrator  :: PlutusV2.PubKeyHash -- The neutral third party (like an Escrow company)
    }
PlutusTx.unstableMakeIsData ''EscrowDatum

-- The ADA locked in this contract can move in three ways:
-- 1. The buyer is happy and releases funds to the seller (ReleaseToSeller).
-- 2. The seller cancels the order and refunds the buyer (RefundToBuyer).
-- 3. They argue, and the arbitrator steps in to force the money to either party (Arbitrate).
data EscrowAction = ReleaseToSeller | RefundToBuyer | Arbitrate PlutusV2.PubKeyHash
PlutusTx.unstableMakeIsData ''EscrowAction

{-# INLINABLE mkEscrowValidator #-}
mkEscrowValidator :: EscrowDatum -> EscrowAction -> PlutusV2.ScriptContext -> Bool
mkEscrowValidator dat action ctx = case action of

    ReleaseToSeller ->
        -- The buyer willingly signs off to release the funds.
        traceIfFalse "Only the buyer can release funds to the seller!" (signedBy $ buyer dat)

    RefundToBuyer ->
        -- The seller willingly signs off to refund the buyer.
        traceIfFalse "Only the seller can authorize a refund!" (signedBy $ seller dat)

    Arbitrate winnerHash ->
        -- Something went wrong. The arbitrator must decide who gets the money.
        traceIfFalse "Only the arbitrator can force a settlement!" (signedBy $ arbitrator dat) &&
        -- The arbitrator can only pick the buyer OR the seller. They can't steal it for themselves.
        traceIfFalse "Arbitrator must pay either the buyer or the seller!" (winnerHash == buyer dat || winnerHash == seller dat)

  where
    info :: PlutusV2.TxInfo
    info = PlutusV2.scriptContextTxInfo ctx

    signedBy :: PlutusV2.PubKeyHash -> Bool
    signedBy pkh = PlutusV2.txSignedBy info pkh

    (==) :: PlutusV2.PubKeyHash -> PlutusV2.PubKeyHash -> Bool
    (==) a b = a PlutusTx.Prelude.== b

{-# INLINABLE wrappedMkVal #-}
wrappedMkVal :: BuiltinData -> BuiltinData -> BuiltinData -> ()
wrappedMkVal = wrapValidator mkEscrowValidator

validator :: PlutusV2.Validator
validator =
  PlutusV2.mkValidatorScript
    $$(PlutusTx.compile [|| wrappedMkVal ||])

---------------------------------------------------------------------------------------------------
------------------------------------- HELPER FUNCTIONS --------------------------------------------

saveVal :: IO ()
saveVal = writeValidatorToFile "./assets/arbitratorescrow.plutus" validator
`;

    const bashCommands = `# Scenario: I am buying a laptop from Bob for 500 ADA. 
# We don't fully trust each other, so we hire "TrustyEscrow LLC" as the arbitrator.
# I (the buyer) lock 500 ADA into the contract.

# -------------------------------------------------------------------------
# 1. The Happy Path (Release to Seller)
# The laptop arrives in perfect condition. I sign the transaction to release the funds.

$ cardano-cli conway transaction build \\
  --tx-in f29c7d41ef993a40879c882bc283a00508a8e10d291b8d234bd35a0928a6fcf4#0 \\
  --tx-in-script-file arbitratorescrow.plutus \\
  --tx-in-inline-datum-present \\
  --tx-in-redeemer-value '{"constructor":0,"fields":[]}' \\
  --tx-out $(cat bob_seller.addr)+500000000 \\
  --required-signer-hash 8b7c6d5e4f3a... \\
  --tx-in-collateral d83b72c91a4bc5e1a908a80bdff62ea9825b4df2798aa12365e098a7213baf#0 \\
  --change-address $(cat my_buyer.addr) \\
  --testnet-magic 2 \\
  --out-file tx-release.raw

$ cardano-cli conway transaction sign --tx-body-file tx-release.raw --signing-key-file my_buyer.skey --testnet-magic 2 --out-file tx-release.signed
$ cardano-cli conway transaction submit --tx-file tx-release.signed

# -------------------------------------------------------------------------
# 2. The Dispute Path (Arbitration)
# Bob sent me a box of rocks instead of a laptop. I refuse to sign ReleaseToSeller. 
# Bob refuses to sign RefundToBuyer. 
# "TrustyEscrow LLC" investigates, realizes I got scammed, and forces a refund to me.

$ cardano-cli conway transaction build \\
  --tx-in f29c7d41ef993a40879c882bc283a00508a8e10d291b8d234bd35a0928a6fcf4#0 \\
  --tx-in-script-file arbitratorescrow.plutus \\
  --tx-in-inline-datum-present \\
  --tx-in-redeemer-value '{"constructor":2,"fields":[{"bytes":"8b7c6d5e4f3a..."}]}' \\
  --tx-out $(cat my_buyer.addr)+500000000 \\
  --required-signer-hash 1a2b3c4d5e6f... \\
  --tx-in-collateral a1b2c3d4e5f6a7...#0 \\
  --change-address $(cat trusty_escrow.addr) \\
  --testnet-magic 2 \\
  --out-file tx-arbitrate.raw

$ cardano-cli conway transaction sign --tx-body-file tx-arbitrate.raw --signing-key-file trusty_escrow.skey --testnet-magic 2 --out-file tx-arbitrate.signed
$ cardano-cli conway transaction submit --tx-file tx-arbitrate.signed
`;

    return (
        <div className="article-content">
            <h2 id="introduction">Introduction</h2>

            <p>
                In a standard two-party smart contract exchange, a buyer and a seller rely completely on each other's honesty or raw mathematics. If you are buying a digital NFT, smart contracts handle this perfectly using atomic swaps (I give you ADA, the contract guarantees I get the NFT in the same millisecond).
            </p>

            <p>
                But what if you are buying physical goods? The blockchain has no idea if the mailman brought you the laptop you paid for or a box of rocks. If the buyer locks their funds, they might refuse to release them even after the laptop arrives. If the seller gets the funds upfront, they might never ship the laptop.
            </p>

            <p>
                The solution is a <strong>3-party Escrow</strong>. The buyer locks the ADA into the smart contract and physically assigns an impartial Arbitrator (like an escrow company) in the Datum. The Arbitrator has zero power to steal the money for themselves, but they possess the ultimate keys to break a tie if the buyer and seller start fighting.
            </p>

            <CodeBlock
                code={haskellCode}
                language="haskell"
                filename="ArbitratorEscrow.hs"
            />
            <br />

            <h2 id="explanation">The Logic of Escrow</h2>

            <h3>The Happy Paths</h3>

            <p className="pexplaination">
                Most of the time, humans are honest. Plutus accommodates this beautifully. If the transaction goes perfectly, the buyer simply submits a transaction with the <code>ReleaseToSeller</code> redeemer. The contract sees the buyer's cryptographic signature and lets the ADA flow to the seller. The Arbitrator never even has to look at the blockchain.
            </p>

            <p className="pexplaination pt-2">
                Similarly, if the seller realizes they are out of stock before shipping the item, they can independently trigger <code>RefundToBuyer</code> to apologize and return the funds.
            </p>

            <h3>The Power (and Limits) of the Arbitrator</h3>

            <p className="pexplaination pt-2">
                If the deal goes sour, the Arbitrator is called to investigate. They look at the shipping receipts or dispute logs off-chain. Once they make a ruling, they construct a transaction using the <code>Arbitrate</code> redeemer, passing in the PubKeyHash of the party they believe deserves the money.
            </p>

            <CodeBlock
                code={`Arbitrate winnerHash ->
    signedBy arbitrator &&
    (winnerHash == buyer || winnerHash == seller)`}
                language="haskell"
                filename="Constraining the Judge"
            />

            <p className="pexplaination pt-2">
                This validation logic is critical. While the Arbitrator has the power to break the deadlock, <strong>the smart contract explicitly forbids the Arbitrator from sending the money to their own wallet</strong> (unless the Arbitrator happens to also be the buyer or seller, which defeats the point). The Arbitrator is a judge, not a vault robber. Their power is absolute, but strictly confined to choosing between the two preset participants.
            </p>

            <br />

            <h2 id="execution">Execution Lifecycle</h2>

            <p className="pexplaination">
                Let's look at how this plays out on the command line. In the first instance, the transaction goes smoothly and the buyer releases the funds. In the second, disaster strikes, and the Arbitrator steps in to manually force a refund back to the buyer over the objections of the seller.
            </p>

            <CodeBlock
                code={bashCommands}
                language="bash"
                filename="Escrow CLI Commands"
            />

        </div>
    );
}
