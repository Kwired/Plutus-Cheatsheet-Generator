/* eslint-disable react-refresh/only-export-components */
import CodeBlock from "@/components/layouts/CodeBlock";

export const articleMeta = {
    id: "escrow-validator",
    title: "Trustless Escrow",
    subtitle: "A two-party smart contract enforcing a secure item-for-ADA exchange",
    date: "2025-02-22T10:00:00.000Z",
    readTime: "9 min read",
    tags: ["plutus", "cardano", "defi", "escrow", "advanced"],
    author: {
        name: "Aman Kumar",
        avatar: "https://i.pravatar.cc/48?img=12"},
  plutusVersion: "V2",
  complexity: "Advanced",
  useCase: "NFTs"
};

export default function EscrowValidatorArticle() {
    const haskellCode = `{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE ImportQualifiedPost #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE OverloadedStrings   #-}
{-# LANGUAGE TemplateHaskell     #-}

module EscrowValidator where

import qualified Plutus.V2.Ledger.Api as PlutusV2
import           PlutusTx             (BuiltinData, compile, unstableMakeIsData)
import           PlutusTx.Prelude     (Bool, Integer, traceIfFalse, (==), (>=), (&&), ($))
import           Plutus.V1.Ledger.Value (valueOf)
import           Prelude              (IO)
import           Utilities            (wrapValidator, writeValidatorToFile)

---------------------------------------------------------------------------------------------------
----------------------------------- ON-CHAIN / VALIDATOR ------------------------------------------

-- The Datum acts as the Escrow conditions. It stores who the buyer is, 
-- who the seller is, and exactly how much ADA the seller expects in return.
data EscrowDatum = EscrowDatum
    { buyer     :: PlutusV2.PubKeyHash
    , seller    :: PlutusV2.PubKeyHash
    , adaPrice  :: Integer
    }
PlutusTx.unstableMakeIsData ''EscrowDatum

-- The Redeemer represents the action the users are trying to take.
data EscrowAction = Refund | Payout
PlutusTx.unstableMakeIsData ''EscrowAction

{-# INLINABLE mkEscrowValidator #-}
mkEscrowValidator :: EscrowDatum -> EscrowAction -> PlutusV2.ScriptContext -> Bool
mkEscrowValidator dat action ctx =
    case action of
        Refund ->
            -- Only the buyer can take their money back (refund) if the deal cancels.
            traceIfFalse "Only the buyer can request a refund!" signedByBuyer
            
        Payout ->
            -- For the seller to get paid, the transaction must physically route the ADA 
            -- to the seller's address. Also, the seller must sign it.
            traceIfFalse "Only the seller can authorize the payout!" signedBySeller &&
            traceIfFalse "Seller did not receive the correct ADA price!" sellerGotPaid
  where
    info :: PlutusV2.TxInfo
    info = PlutusV2.scriptContextTxInfo ctx

    signedByBuyer :: Bool
    signedByBuyer = PlutusV2.txSignedBy info (buyer dat)
    
    signedBySeller :: Bool
    signedBySeller = PlutusV2.txSignedBy info (seller dat)

    sellerGotPaid :: Bool
    sellerGotPaid =
      let 
        -- Calculate the total ADA outputted specifically to the seller's public key hash
        sellerValueOut = PlutusV2.valuePaidTo info (seller dat)
        sellerAdaOut   = valueOf sellerValueOut PlutusV2.adaSymbol PlutusV2.adaToken
      in 
        sellerAdaOut >= adaPrice dat

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
saveVal = writeValidatorToFile "./assets/escrow.plutus" validator
`;

    const bashCommands = `# 1. Buyer locks their ADA into the Escrow Contract.
# We set the buyer hash, seller hash, and the agreed price in Lovelace (100 ADA).
# JSON Datum: {"constructor": 0, "fields": [{"bytes": "buyer_hash_111..."}, {"bytes": "seller_hash_222..."}, {"int": 100000000}]}

$ cardano-cli conway transaction build \\
  --tx-in dummy_tx_hash_uuid_here_1111111111111111#0 \\
  --tx-out $(cat escrow.addr)+100000000 \\
  --tx-out-inline-datum-value '{"constructor": 0, "fields": [{"bytes": "buyer_hash_111111111111111111111111"}, {"bytes": "seller_hash_222222222222222222222222"}, {"int": 100000000}]}' \\
  --change-address addr_test1_dummy_buyer_address \\
  --testnet-magic 2 \\
  --out-file tx-lock-escrow.raw

# ... sign and submit as buyer ...

-------------------------------------------------------------------------

# 2. Seller authorizes payout and claims the ADA
# The seller builds a transaction that consumes the escrow UTxO.
# Redeemer: Payout (Constructor 1) -> {"constructor": 1, "fields": []}

$ cardano-cli conway transaction build \\
  --tx-in dummy_tx_hash_uuid_here_escrow_holding_123#0 \\
  --tx-in-script-file escrow.plutus \\
  --tx-in-inline-datum-present \\
  --tx-in-redeemer-value '{"constructor": 1, "fields": []}' \\
  --tx-out addr_test1_dummy_seller_address+100000000 \\
  --required-signer-hash seller_hash_222222222222222222222222 \\
  --tx-in-collateral dummy_collateral_hash_uuid_here_4444#0 \\
  --change-address addr_test1_dummy_buyer_address \\
  --testnet-magic 2 \\
  --out-file tx-payout.raw

# Sign the transaction with the Seller's Key!
$ cardano-cli conway transaction sign \\
  --tx-body-file tx-payout.raw \\
  --signing-key-file ../../../keys/seller.skey \\
  --testnet-magic 2 \\
  --out-file tx-payout.signed

$ cardano-cli conway transaction submit --tx-file tx-payout.signed
`;

    return (
        <div className="article-content">
            <h2 id="introduction">Introduction</h2>

            <p>
                In centralized finance, an escrow is an independent third party that holds assets
                safely while two other parties complete a transaction. On Cardano, we completely
                eliminate the need for a trusted third party. The Smart Contract itself serves
                as the unbreakable, mathematical escrow.
            </p>

            <p>
                The <strong>Trustless Escrow Validator</strong> protects both a Buyer and a Seller.
                It ensures that locked funds can only be released to the seller if the exact
                agreed-upon price is met, while preserving the buyer's right to refund the
                transaction if the deal falls through.
            </p>

            <CodeBlock
                code={haskellCode}
                language="haskell"
                filename="EscrowValidator.hs"
            />
            <br />

            <h2 id="explanation">How It Really Works</h2>

            <h3>Action Based Redeemers</h3>

            <p className="pexplaination">
                This is an excellent example of using the Redeemer as a router for complex
                conditional logic. In this contract, the user decides which "path" to take
                by submitting either <code>Refund</code> or <code>Payout</code>.
            </p>

            <CodeBlock
                code={`case action of
    Refund -> traceIfFalse "Only the buyer..." signedByBuyer
    Payout -> traceIfFalse "Seller did not get paid!" sellerGotPaid`}
                language="haskell"
                filename="Redeemer Routing"
            />

            <p className="pexplaination">
                By utilizing a <code>case</code> statement over algebraic data types, we ensure
                that the Plutus logic cleanly isolates the business rules. It's impossible for
                the seller to randomly trigger the refund path, or the buyer to trigger the payout
                path without signatures!
            </p>

            <h3>Guaranteed Delivery (valuePaidTo)</h3>

            <p className="pexplaination pt-2">
                The core mechanism of an escrow is securely distributing the money. In the Payout
                branch, the Plutus script leverages <code>PlutusV2.valuePaidTo</code>. This function
                scans the entire transaction that the user just submitted, counts up all outputs sending ADA
                specifically to the Seller's PubKeyHash, and calculates the total. If that total is
                less than the agreed <code>adaPrice</code> stored in the Datum, the transaction is burned!
            </p>

            <br />

            <h2 id="execution">Execution Lifecycle</h2>

            <p className="pexplaination">
                Setting up the escrow is straightforward. The buyer creates a transaction locking
                their ADA into the script and creating an explicit contract with their Datum.
            </p>

            <CodeBlock
                code={bashCommands}
                language="bash"
                filename="Escrow CLI Commands"
            />

            <h3>Asymmetric Logic in the CLI</h3>

            <p className="pexplaination pt-2">
                Notice how during the <code>tx-payout</code> CLI build phase, the transaction
                must heavily leverage <code>--required-signer-hash</code> for the Seller, but
                also must physically route an explicit <code>--tx-out</code> of 100 ADA to the
                Seller's address. If the person building the transaction attempts to route the
                100 ADA back to themselves instead, the Plutus script evaluation fails before the
                block is propagated. It forces honest behavior.
            </p>

        </div>
    );
}
