import CodeBlock from "@/components/layouts/CodeBlock";

export const articleMeta = {
    id: "doublesatisfaction",
    title: "Double Satisfaction Exploit",
    subtitle: "The classic EUTxO vulnerability where an attacker tricks two separate smart contracts into paying the exact same output",
    date: "2025-02-25T11:00:00.000Z",
    readTime: "12 min read",
    tags: ["plutus", "cardano", "security", "exploit", "expert"],
    author: {
        name: "Aman Kumar",
        avatar: "https://i.pravatar.cc/48?img=21",
    },
};

export default function DoubleSatisfactionArticle() {
    const haskellCode = `{-# LANGUAGE DataKinds           #-}
{-# LANGUAGE ImportQualifiedPost #-}
{-# LANGUAGE NoImplicitPrelude   #-}
{-# LANGUAGE OverloadedStrings   #-}
{-# LANGUAGE TemplateHaskell     #-}

module DoubleSatisfaction where

import qualified Plutus.V2.Ledger.Api as PlutusV2
import           PlutusTx             (BuiltinData, compile)
import           PlutusTx.Prelude     (Bool, Integer, traceIfFalse, (&&), ($), (>=))
import           Plutus.V1.Ledger.Value (valueOf)
import           Prelude              (IO)
import           Utilities            (wrapValidator, writeValidatorToFile)

---------------------------------------------------------------------------------------------------
----------------------------------- ON-CHAIN / VULNERABLE VALIDATOR -------------------------------

-- ❌ VULNERABLE DESIGN ❌
-- Imagine two distinct users (Alice and Bob) both use this identical smart contract independently.
-- Alice locked 50 ADA and said "Pay John". 
-- Bob locked 50 ADA and said "Pay John".
-- John should receive 100 ADA total. But what if John only takes 50 ADA and destroys both UTxOs?

{-# INLINABLE mkVulnerableEscrow #-}
mkVulnerableEscrow :: PlutusV2.PubKeyHash -> () -> PlutusV2.ScriptContext -> Bool
mkVulnerableEscrow recipientPkh () ctx = 
    -- The script simply checks that the transaction outputs *at least* 50 ADA
    -- to the intended recipient's public key hash.
    traceIfFalse "Recipient was not paid the correct amount!" recipientPaid
  where
    info :: PlutusV2.TxInfo
    info = PlutusV2.scriptContextTxInfo ctx

    recipientPaid :: Bool
    recipientPaid =
        let
            -- Find all outputs going to the recipient
            outputsToRecipient = [ o | o <- PlutusV2.txInfoOutputs info 
                                     , PlutusV2.txOutAddress o == PlutusV2.pubKeyHashAddress recipientPkh ]
            
            -- Sum the ADA
            totalAda = sum [ valueOf (PlutusV2.txOutValue o) PlutusV2.adaSymbol PlutusV2.adaToken | o <- outputsToRecipient ]
        in
            -- Hardcoded: The recipient must get at least 50 ADA.
            totalAda >= 50000000


---------------------------------------------------------------------------------------------------
----------------------------------- THE FIX: UNIQUE IDENTIFIERS -----------------------------------

-- ✅ SECURE DESIGN ✅
-- To prevent an attacker from grouping multiple script inputs together and using a single
-- output to satisfy them all, you must either force unique datum tags on the outputs, 
-- or explicitly dictate exactly how many inputs from this script address are allowed.

{-# INLINABLE mkSecureEscrow #-}
mkSecureEscrow :: PlutusV2.PubKeyHash -> () -> PlutusV2.ScriptContext -> Bool
mkSecureEscrow recipientPkh () ctx = 
    traceIfFalse "Recipient was not paid the correct amount!" recipientPaid &&
    -- If we restrict the transaction to only consuming ONE input from this script address,
    -- the attacker cannot physically group Alice's and Bob's UTxOs into the same transaction
    -- to double-satisfy them.
    traceIfFalse "Cannot batch multiple inputs from this script!" singleScriptInput
  where
    info :: PlutusV2.TxInfo
    info = PlutusV2.scriptContextTxInfo ctx

    recipientPaid :: Bool
    recipientPaid =
        let
            outputsToRecipient = [ o | o <- PlutusV2.txInfoOutputs info 
                                     , PlutusV2.txOutAddress o == PlutusV2.pubKeyHashAddress recipientPkh ]
            totalAda = sum [ valueOf (PlutusV2.txOutValue o) PlutusV2.adaSymbol PlutusV2.adaToken | o <- outputsToRecipient ]
        in
            totalAda >= 50000000

    -- Count how many inputs in this transaction are coming from THIS specific contract address
    singleScriptInput :: Bool
    singleScriptInput =
        let
            ownInputs = [ i | i <- PlutusV2.txInfoInputs info
                            , PlutusV2.txOutAddress (PlutusV2.txInInfoResolved i) 
                              == PlutusV2.txOutAddress (PlutusV2.txInInfoResolved (head (PlutusV2.scriptContextTxInfoInputs info))) ]
        in
            length ownInputs == 1

    length :: [a] -> Integer
    length []     = 0
    length (_:xs) = 1 + length xs

{-# INLINABLE wrappedVulnVal #-}
wrappedVulnVal :: BuiltinData -> BuiltinData -> BuiltinData -> ()
wrappedVulnVal = wrapValidator mkVulnerableEscrow

validator :: PlutusV2.Validator
validator =
  PlutusV2.mkValidatorScript
    $$(PlutusTx.compile [|| wrappedVulnVal ||])
`;

    const bashCommands = `# Scenario: Alice locked 50 ADA into the Escrow contract for John.
# Bob locked 50 ADA into the Escrow contract for John.
#
# John should get 100 ADA. But John is a hacker. 
# John constructs a single transaction that consumes BOTH Alice's UTxO and Bob's UTxO.

# -------------------------------------------------------------------------
# THE DOUBLE SATISFACTION ATTACK
# John creates a single output to himself for 50 ADA. 
# And creates a change output to himself for the remaining 50 ADA (effectively stealing Bob's money).

$ cardano-cli conway transaction build \\
  --tx-in f29c7d41ef993a40...#0 \\  <-- Alice's 50 ADA Escrow UTxO
  --tx-in-script-file vulnerable_escrow.plutus \\
  --tx-in-inline-datum-present \\
  --tx-in-redeemer-value '{"constructor":0,"fields":[]}' \\
  --tx-in a1b2c3d4e5f6a7b8...#1 \\  <-- Bob's 50 ADA Escrow UTxO
  --tx-in-script-file vulnerable_escrow.plutus \\
  --tx-in-inline-datum-present \\
  --tx-in-redeemer-value '{"constructor":0,"fields":[]}' \\
  \\
  # The Payload: John pays himself 50 ADA.
  --tx-out $(cat john.addr)+50000000 \\
  \\
  # The Steal: The transaction balances perfectly, but John pockets the other 50 ADA!
  --change-address $(cat john_secret_wallet.addr) \\
  --tx-in-collateral d83b72c91a4bc5e1...#0 \\
  --testnet-magic 2 \\
  --out-file tx-attack.raw

$ cardano-cli conway transaction sign --tx-body-file tx-attack.raw --signing-key-file john.skey --testnet-magic 2 --out-file tx-attack.signed
$ cardano-cli conway transaction submit --tx-file tx-attack.signed

# Result: 
# The Cardano ledger evaluates Alice's UTxO: "Is there an output to John for 50 ADA?" -> True!
# The Cardano ledger evaluates Bob's UTxO: "Is there an output to John for 50 ADA?" -> True!
# Both separate UTxOs look at the exact same, single 50 ADA output and they both return True.
# John has successfully stolen Bob's 50 ADA.
`;

    return (
        <div className="article-content">
            <h2 id="introduction">Introduction</h2>

            <p>
                In Ethereum, smart contracts execute sequentially. Contract A finishes, and then Contract B executes. In Cardano's eUTxO model, all smart contracts involved in a transaction execute simultaneously. They don't talk to each other. They just look at the list of inputs and the list of outputs, run their internal logic independently, and return <code>True</code> or <code>False</code>.
            </p>

            <p>
                If two different scripts look at the exact same output and say, "Wow, that output perfectly fulfills my requirement!", they both return <code>True</code>, even though they were only satisfied <em>once</em>. This is the fabled <strong>Double Satisfaction Exploit</strong>.
            </p>

            <CodeBlock
                code={haskellCode}
                language="haskell"
                filename="DoubleSatisfaction.hs"
            />
            <br />

            <h2 id="explanation">The Vulnerability Explained</h2>

            <h3>The Blind Spots of Scripts</h3>

            <p className="pexplaination">
                Imagine two bounties are posted by two different people. Bounty A requires you to chop down a tree. Bounty B requires you to chop down a tree. 
            </p>

            <p className="pexplaination pt-2">
                You chop down <strong>one</strong> tree. You take a photo of it. You show the photo to the person running Bounty A, and they pay you 50 ADA. You walk over to the person running Bounty B, show them the exact same photo, and they also pay you 50 ADA. 
            </p>

            <p className="pexplaination pt-2">
                This is exactly how a naive Plutus script operates. <code>mkVulnerableEscrow</code> simply spins through the <code>txInfoOutputs</code> and checks if there is an output to John's address containing 50 ADA. It has absolutely no idea that Alice's UTxO script and Bob's UTxO script are running at the exact same time, staring at the exact same output. The math checks out. The transaction succeeds. 
            </p>

            <h3>The Fix: Singular Focus</h3>

            <CodeBlock
                code={`ownInputs = [ i | i <- PlutusV2.txInfoInputs info
                , PlutusV2.txOutAddress (PlutusV2.txInInfoResolved i) 
                  == PlutusV2.txOutAddress (PlutusV2.txInInfoResolved (head ...)) ]

length ownInputs == 1`}
                language="haskell"
                filename="Clamping Inputs"
            />

            <p className="pexplaination pt-2">
                There are multiple ways to defeat a Double Satisfaction attack. The most robust method is assigning fiercely unique datum tags to every single output, forcing the script to only accept outputs that perfectly mirror the input's state.
            </p>

            <p className="pexplaination">
                The simpler method, demonstrated in <code>mkSecureEscrow</code>, is to simply forbid the script from sharing a transaction with itself. By demanding that <code>length ownInputs == 1</code>, the script violently crashes if an attacker attempts to bundle Alice's UTxO and Bob's UTxO into the same execution. John must execute Alice's escrow payload, taking his 50 ADA, and then execute an entirely separate transaction for Bob's 50 ADA, resulting in 100 ADA total payouts instead of him pocketing the difference.
            </p>

            <br />

            <h2 id="execution">The Attacker's CLI Lifecycle</h2>

            <p className="pexplaination">
                This CLI transaction is the holy grail of eUTxO exploits. By intentionally consuming two separate script UTxOs, but only providing one payout output, the attacker creates a massive imbalance. Because Cardano must balance all inputs to all outputs, the "leftover" 50 ADA natively cascades into the attacker's <code>--change-address</code>. The scripts are entirely oblivious to this theft.
            </p>

            <CodeBlock
                code={bashCommands}
                language="bash"
                filename="The Double Satisfaction Exploit"
            />

        </div>
    );
}
