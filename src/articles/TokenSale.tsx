import CodeBlock from "@/components/layouts/CodeBlock";

export const articleMeta = {
    id: "tokensale",
    title: "Token Sale / ICO Contract",
    subtitle: "A decentralized vending machine — send ADA, receive tokens instantly based on a hardcoded price",
    date: "2025-02-23T18:00:00.000Z",
    readTime: "11 min read",
    tags: ["plutus", "cardano", "defi", "ico", "intermediate"],
    author: {
        name: "Aman Kumar",
        avatar: "https://i.pravatar.cc/48?img=21",
    },
};

export default function TokenSaleArticle() {
    const haskellCode = `{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE ImportQualifiedPost #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE OverloadedStrings   #-}
{-# LANGUAGE TemplateHaskell     #-}

module TokenSale where

import qualified Plutus.V2.Ledger.Api as PlutusV2
import           PlutusTx             (BuiltinData, compile, unstableMakeIsData)
import           PlutusTx.Prelude     (Bool, Integer, traceIfFalse, (==), (&&),
                                       ($), (*), (+), (-), (<=), (>=), divide, mconcat)
import           Plutus.V1.Ledger.Value (valueOf)
import           Prelude              (IO)
import           Utilities            (wrapValidator, writeValidatorToFile)

---------------------------------------------------------------------------------------------------
----------------------------------- ON-CHAIN / VALIDATOR ------------------------------------------

-- The datum holds the configuration for our token sale.
-- Who gets the ADA? What is the token we are selling? What's the price?
data SaleDatum = SaleDatum
    { seller      :: PlutusV2.PubKeyHash    -- The wallet collecting the ADA
    , tokenPolicy :: PlutusV2.CurrencySymbol -- The Policy ID of the token being sold
    , tokenName   :: PlutusV2.TokenName      -- The hex name of the token being sold
    , pricePerTok :: Integer                 -- Price in Lovelace for *one* unit of the token
    }
PlutusTx.unstableMakeIsData ''SaleDatum

-- To buy tokens, the buyer must tell the contract exactly how many they are purchasing.
-- If the seller just wants to pull the unsold tokens back, they use the Close action.
data SaleAction = Buy { amountToBuy :: Integer } | Close

PlutusTx.unstableMakeIsData ''SaleAction

{-# INLINABLE mkTokenSaleValidator #-}
mkTokenSaleValidator :: SaleDatum -> SaleAction -> PlutusV2.ScriptContext -> Bool
mkTokenSaleValidator dat action ctx = case action of

    Buy amount ->
        -- Ensure the buyer isn't trying to buy zero or negative tokens (which is a real attack vector)
        traceIfFalse "Must buy at least 1 token!" (amount >= 1) &&
        -- The big check: Did the seller actually get paid the correct amount of ADA?
        traceIfFalse "Seller wasn't paid the correct amount of ADA!" (validPayment amount) &&
        -- The contract itself needs to retain the remaining unsold tokens.
        -- We calculate the exact difference and enforce that it goes back to the script.
        traceIfFalse "Script didn't receive the remaining tokens back!" (contractStateUpdated amount)

    Close ->
        -- Only the seller can shut this vending machine down and take the remaining tokens.
        traceIfFalse "Only the seller can close the sale!" signedBySeller

  where
    info :: PlutusV2.TxInfo
    info = PlutusV2.scriptContextTxInfo ctx

    signedBySeller :: Bool
    signedBySeller = PlutusV2.txSignedBy info (seller dat)

    -- The math is simple: price per token * number of tokens bought.
    -- We check the transaction outputs to verify the seller's wallet received *at least* this much ADA.
    validPayment :: Integer -> Bool
    validPayment amt =
        let requiredAda = amt * pricePerTok dat
            sellerOutputs = [ o | o <- PlutusV2.txInfoOutputs info 
                                , PlutusV2.txOutAddress o == PlutusV2.pubKeyHashAddress (seller dat) ]
            
            -- Add up the ADA in all outputs going to the seller
            totalAdaPaid = sum [ valueOf (PlutusV2.txOutValue o) PlutusV2.adaSymbol PlutusV2.adaToken | o <- sellerOutputs ]
        in
            totalAdaPaid >= requiredAda

    -- This is where the magic happens. A Plutus script cannot "send" tokens.
    -- Instead, the transaction *spends* the UTxO containing all the tokens,
    -- gives the buyer their share, and MUST create a new UTxO back at the script
    -- containing the leftovers + the exact same datum.
    contractStateUpdated :: Integer -> Bool
    contractStateUpdated boughtAmt =
        let
            -- 1. How many tokens were in the script UTxO being consumed?
            ownInput = PlutusV2.txInInfoResolved $ head [ i | i <- PlutusV2.txInfoInputs info
                                                        , PlutusV2.txOutAddress (PlutusV2.txInInfoResolved i) 
                                                          == PlutusV2.txOutAddress (PlutusV2.txInInfoResolved (head (PlutusV2.scriptContextTxInfoInputs info))) ]
            
            startingTokens = valueOf (PlutusV2.txOutValue ownInput) (tokenPolicy dat) (tokenName dat)
            
            -- 2. How many tokens should be left over?
            expectedRemaining = startingTokens - boughtAmt

            -- 3. Find the output going back to the script
            ownOutputs = [ o | o <- PlutusV2.txInfoOutputs info
                             , PlutusV2.txOutAddress o 
                               == PlutusV2.txOutAddress (PlutusV2.txInInfoResolved (head (PlutusV2.scriptContextTxInfoInputs info))) ]

        in
            if expectedRemaining == 0
            then True -- If they bought exactly everything, no change output is needed! All sold out.
            else
                case ownOutputs of
                    [out] -> 
                        -- Check that the remaining token balance is exactly correct
                        let actualRemaining = valueOf (PlutusV2.txOutValue out) (tokenPolicy dat) (tokenName dat)
                        in actualRemaining == expectedRemaining
                    _ -> False -- If there are 0 or >1 continuing outputs, reject it.

{-# INLINABLE wrappedMkVal #-}
wrappedMkVal :: BuiltinData -> BuiltinData -> BuiltinData -> ()
wrappedMkVal = wrapValidator mkTokenSaleValidator

validator :: PlutusV2.Validator
validator =
  PlutusV2.mkValidatorScript
    $$(PlutusTx.compile [|| wrappedMkVal ||])

---------------------------------------------------------------------------------------------------
------------------------------------- HELPER FUNCTIONS --------------------------------------------

saveVal :: IO ()
saveVal = writeValidatorToFile "./assets/tokensale.plutus" validator
`;

    const bashCommands = `# Scenario: A user wants to buy 1,000 "HOSKY" tokens from our smart contract.
# The hardcoded price in the Datum is 50,000 Lovelace (0.05 ADA) per token.
# Therefore, 1,000 tokens * 50,000 = 50,000,000 Lovelace (50 ADA) required.

# The script currently holds 100,000 HOSKY tokens.
# The buyer needs to:
# 1. Send 50 ADA to the seller.
# 2. Take 1,000 HOSKY to their own wallet.
# 3. Return the remaining 99,000 HOSKY back to the script with the EXACT SAME DATUM.

$ cardano-cli conway transaction build \\
  --tx-in a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2#0 \\
  --tx-in-script-file tokensale.plutus \\
  --tx-in-inline-datum-present \\
  --tx-in-redeemer-value '{"constructor":0,"fields":[{"int":1000}]}' \\
  --tx-out $(cat seller.addr)+50000000 \\
  --tx-out $(cat tokensale.addr)+2000000+"99000 a0028f350aaabe0545fdcb56b039bfb08e4bb4d8c4d7c3c7d481c235.484f534b59" \\
  --tx-out-inline-datum-value '{"constructor":0,"fields":[{"bytes":"seller_pkh_hash..."},{"bytes":"a0028f350aaabe0545fdcb56b039bfb08e4bb4d8c4d7c3c7d481c235"},{"bytes":"484f534b59"},{"int":500000}]}' \\
  --tx-in-collateral f1e2d3c4b5a697867564534231201f1e1d1c1b1a191817161514131211100f0e#0 \\
  --change-address $(cat buyer.addr) \\
  --testnet-magic 2 \\
  --out-file tx-buy.raw

# Sign and submit
$ cardano-cli conway transaction sign --tx-body-file tx-buy.raw --signing-key-file buyer.skey --testnet-magic 2 --out-file tx-buy.signed
$ cardano-cli conway transaction submit --tx-file tx-buy.signed
`;

    return (
        <div className="article-content">
            <h2 id="introduction">Introduction</h2>

            <p>
                Imagine a vending machine sitting in the middle of the desert. There's no owner standing nearby, no security cameras, and no internet connection. Yet, if you slide exactly 50 ADA into the slot, it perfectly dispenses 1,000 ShinyTokens. If you slide in 49 ADA, it jams and returns your money immediately. Furthermore, if you try to kick the machine to steal the remaining tokens, its reinforced steel deflects your attack entirely.
            </p>

            <p>
                That is what a <strong>Token Sale Smart Contract</strong> is on Cardano. It's a completely trustless, decentralized mechanism where a seller locks their token inventory into an address, defines a rigid price per token inside a datum, and lets anyone in the world walk up and execute trades programmatically.
            </p>

            <CodeBlock
                code={haskellCode}
                language="haskell"
                filename="TokenSale.hs"
            />
            <br />

            <h2 id="explanation">The Vending Machine Logic</h2>

            <h3>Enforcing the Payment</h3>

            <p className="pexplaination">
                When a user wants to buy tokens, they submit a transaction to the blockchain proposing a massive set of state changes. The Plutus script's only job is to look at that proposal and answer one question: <i>"Is this fair based on the rules?"</i>
            </p>

            <p className="pexplaination pt-2">
                The first thing it checks is whether the seller is getting paid. The redeemer clearly states how many tokens the buyer <i>claims</i> to be buying (e.g., <code>Buy 1000</code>). The script takes that amount, multiplies it by the <code>pricePerTok</code> stored in the datum, and then brutally audits the transaction outputs. It scans every single output going to the <code>seller</code> address and sums the ADA. If the math doesn't check out, the transaction fails with <i>"Seller wasn't paid the correct amount of ADA!"</i>.
            </p>

            <h3>The Change Mechanic (Continuing Outputs)</h3>

            <p className="pexplaination pt-2">
                This is where Cardano's eUTxO model shines, and where developers from Account-based chains (like Ethereum) often get confused.
            </p>

            <CodeBlock
                code={`expectedRemaining = startingTokens - boughtAmt

if expectedRemaining == 0
then True 
else actualRemaining == expectedRemaining`}
                language="haskell"
                filename="The Change Output"
            />

            <p className="pexplaination pt-2">
                A smart contract UTxO can't just hand out 1,000 tokens and keep the rest. UTxOs are entirely consumed or completely untouched; there is no intermediate state.
            </p>

            <p className="pexplaination">
                Therefore, the buyer's transaction must actually consume the <strong>entire</strong> vending machine UTxO (say, 100,000 tokens). They allocate 1,000 to their own wallet, and they are <strong>forced</strong> by the validator script to create a brand new UTxO at the contract address containing the exact remaining 99,000 tokens, perfectly equipped with the original SaleDatum. If they try to steal those 99,000 tokens, the script halts and the transaction fails.
            </p>

            <br />

            <h2 id="execution">Execution Lifecycle</h2>

            <p className="pexplaination">
                Let's construct the transaction to buy 1,000 HOSKY tokens from the script. We are explicitly constructing the "change" output that goes back to the script address here.
            </p>

            <CodeBlock
                code={bashCommands}
                language="bash"
                filename="Token Sale CLI Commands"
            />

            <h3>The Attack Vector of Zero</h3>

            <p className="pexplaination pt-2">
                Look closely at this line in the validator: <code>traceIfFalse "Must buy at least 1 token!" (amount {'>='} 1)</code>. What happens if we omit this?
            </p>

            <p className="pexplaination">
                An attacker could submit a redeemer of <code>Buy 0</code>. The math states they owe <code>0 * price = 0 ADA</code> to the seller. They consume the entire script UTxO, pay 0 ADA, and send 100% of the tokens to their own wallet, effectively robbing the vending machine blind without triggering the payment failure condition. Always rigorously restrict the bounds of your integers!
            </p>

        </div>
    );
}
