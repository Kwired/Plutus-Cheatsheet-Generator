// src/articles/index.ts
import AlwaysFailsArticle, { articleMeta as AlwaysFailsMeta } from "./AlwaysFails";
import AlwaysSucceedsArticle, { articleMeta as AlwaysSucceedsMeta } from "./AlwaysSucceeds";
import CollateralArticle, { articleMeta as CollateralMeta } from "./CollateralArticle";
import CustomTypesArticle, { articleMeta as CustomTypesMeta } from "./CustomTypes";
import ExploitableSwapArticle, { articleMeta as ExploitableSwapMeta } from "./ExploitableSwapArticle";
import FortyTwoArticle, { articleMeta as FortyTwoMeta } from "./FortyTwo";
import FortyTwoTypedArticle, { articleMeta as FortytwoTypedMeta } from "./FortyTwoTyped";
import FreeMintArticle, { articleMeta as FreeMintMeta } from "./FreeMint";
import NegativeRTimedArticle, { articleMeta as NegativeRTimedMeta } from "./NegativeRTimedArticle";
import NFTMintArticle, { articleMeta as NFTMintMeta } from "./NFTMint";
import NFTMintAgainFails, { articleMeta as NFTMintAgainFailsMeta } from "./NFTMintAgainFails";
import NFTMintBadRedeemer, { articleMeta as NFTMintBadRedeemerMeta } from "./NFTMintBadRedeemer";
import NFTMintFirstTime, { articleMeta as NFTMintFirstTimeMeta } from "./NFTMintFirstTime";
import OneShotMintingPolicyArticle, { articleMeta as OneShotMintingPolicyMeta } from "./OneShotMintingPolicyArticle";
import OracleArticle, { articleMeta as OracleMeta } from "./OracleArticle";
import PlutusBigValidatorArticle, { articleMeta as BigValidatorMeta } from './PlutusBigValidator';
import SignedMintArticle, { articleMeta as SignedMintMeta } from "./SignedMint";
import SignedMintFailArticle, { articleMeta as SignedMintFailMeta } from "./SignedMintFail";
import StakingValidatorArticle, { articleMeta as StakingValidatorMeta } from "./StakingValidatorArticle";
import VestingArticle, { articleMeta as VestingMeta } from "./Vesting";
import HelloWorldArticle, { articleMeta as HelloWorldMeta } from "./HelloWorld";
import PasswordValidatorArticle, { articleMeta as PasswordValidatorMeta } from "./PasswordValidator";
import StateMachineCounterArticle, { articleMeta as StateMachineCounterMeta } from "./StateMachineCounter";
import DeadlineValidatorArticle, { articleMeta as DeadlineValidatorMeta } from "./DeadlineValidator";
import ExpirationValidatorArticle, { articleMeta as ExpirationValidatorMeta } from "./ExpirationValidator";
import MathPuzzleValidatorArticle, { articleMeta as MathPuzzleValidatorMeta } from "./MathPuzzleValidator";
import MultiSigValidatorArticle, { articleMeta as MultiSigValidatorMeta } from "./MultiSigValidator";
import BurnOnlyPolicyArticle, { articleMeta as BurnOnlyPolicyMeta } from "./BurnOnlyPolicy";
import SingleAssetMintingArticle, { articleMeta as SingleAssetMintingMeta } from "./SingleAssetMinting";
import EscrowValidatorArticle, { articleMeta as EscrowValidatorMeta } from "./EscrowValidator";
import StatefulNFTArticle, { articleMeta as StatefulNFTMeta } from "./StatefulNFT";
import BreedingContractArticle, { articleMeta as BreedingContractMeta } from "./BreedingContract";
import LootboxContractArticle, { articleMeta as LootboxContractMeta } from "./LootboxContract";
import TicTacToeArticle, { articleMeta as TicTacToeMeta } from "./TicTacToe";
import GamingMatchmakerArticle, { articleMeta as GamingMatchmakerMeta } from "./GamingMatchmaker";
import AirdropDistributorArticle, { articleMeta as AirdropDistributorMeta } from "./AirdropDistributor";
import RoyaltyEnforcerArticle, { articleMeta as RoyaltyEnforcerMeta } from "./RoyaltyEnforcer";
import CrowdfundingArticle, { articleMeta as CrowdfundingMeta } from "./Crowdfunding";
import TokenSaleArticle, { articleMeta as TokenSaleMeta } from "./TokenSale";
import TimeLockedSavingsArticle, { articleMeta as TimeLockedSavingsMeta } from "./TimeLockedSavings";
import CollateralLoanArticle, { articleMeta as CollateralLoanMeta } from "./CollateralLoan";
import EnglishAuctionArticle, { articleMeta as EnglishAuctionMeta } from "./EnglishAuction";

export const articles = [
  {
    component: EnglishAuctionArticle,
    meta: EnglishAuctionMeta
  },
  {
    component: CollateralLoanArticle,
    meta: CollateralLoanMeta
  },
  {
    component: TimeLockedSavingsArticle,
    meta: TimeLockedSavingsMeta
  },
  {
    component: TokenSaleArticle,
    meta: TokenSaleMeta
  },
  {
    component: CrowdfundingArticle,
    meta: CrowdfundingMeta
  },
  {
    component: RoyaltyEnforcerArticle,
    meta: RoyaltyEnforcerMeta
  },
  {
    component: AirdropDistributorArticle,
    meta: AirdropDistributorMeta
  },
  {
    component: GamingMatchmakerArticle,
    meta: GamingMatchmakerMeta
  },
  {
    component: TicTacToeArticle,
    meta: TicTacToeMeta
  },
  {
    component: LootboxContractArticle,
    meta: LootboxContractMeta
  },
  {
    component: BreedingContractArticle,
    meta: BreedingContractMeta
  },
  {
    component: StatefulNFTArticle,
    meta: StatefulNFTMeta
  },
  {
    component: EscrowValidatorArticle,
    meta: EscrowValidatorMeta
  },
  {
    component: SingleAssetMintingArticle,
    meta: SingleAssetMintingMeta
  },
  {
    component: BurnOnlyPolicyArticle,
    meta: BurnOnlyPolicyMeta
  },
  {
    component: MultiSigValidatorArticle,
    meta: MultiSigValidatorMeta
  },
  {
    component: MathPuzzleValidatorArticle,
    meta: MathPuzzleValidatorMeta
  },
  {
    component: ExpirationValidatorArticle,
    meta: ExpirationValidatorMeta
  },
  {
    component: DeadlineValidatorArticle,
    meta: DeadlineValidatorMeta
  },
  {
    component: PasswordValidatorArticle,
    meta: PasswordValidatorMeta
  },
  {
    component: StateMachineCounterArticle,
    meta: StateMachineCounterMeta
  },
  {
    component: HelloWorldArticle,
    meta: HelloWorldMeta
  },
  {
    component: OneShotMintingPolicyArticle,
    meta: OneShotMintingPolicyMeta
  },
  {
    component: ExploitableSwapArticle,
    meta: ExploitableSwapMeta
  },
  {
    component: StakingValidatorArticle,
    meta: StakingValidatorMeta
  },
  {
    component: NegativeRTimedArticle,
    meta: NegativeRTimedMeta
  },
  {
    component: OracleArticle,
    meta: OracleMeta
  },
  {
    component: CollateralArticle,
    meta: CollateralMeta
  },
  {
    component: NFTMintBadRedeemer,
    meta: NFTMintBadRedeemerMeta
  },
  {
    component: NFTMintAgainFails,
    meta: NFTMintAgainFailsMeta
  },
  {
    component: NFTMintFirstTime,
    meta: NFTMintFirstTimeMeta
  },
  {
    component: NFTMintArticle,
    meta: NFTMintMeta
  },
  {
    component: SignedMintFailArticle,
    meta: SignedMintFailMeta
  },
  {
    component: SignedMintArticle,
    meta: SignedMintMeta
  },
  {
    component: FreeMintArticle,
    meta: FreeMintMeta
  },
  {
    component: VestingArticle,
    meta: VestingMeta
  },
  {
    component: AlwaysFailsArticle,
    meta: AlwaysFailsMeta
  },
  {
    component: AlwaysSucceedsArticle,
    meta: AlwaysSucceedsMeta
  },
  {
    component: CustomTypesArticle,
    meta: CustomTypesMeta
  },
  {
    component: FortyTwoTypedArticle,
    meta: FortytwoTypedMeta
  },
  {
    component: FortyTwoArticle,
    meta: FortyTwoMeta
  },
  {
    component: PlutusBigValidatorArticle,
    meta: BigValidatorMeta
  },
];

// Helper function to get article by ID
export function getArticleById(id: string) {
  return articles.find(article => article.meta.id === id);
}

// For listing all articles on homepage
export function getAllArticles() {
  return articles.map(article => article.meta);
}
export function getArticleIndex(id: string) {
  return articles.findIndex(article => article.meta.id === id);
}

export function getNextArticle(id: string) {
  const index = getArticleIndex(id);
  if (index === -1) return null;
  return articles[index + 1] ?? null;
}

export function getPrevArticle(id: string) {
  const index = getArticleIndex(id);
  if (index <= 0) return null;
  return articles[index - 1] ?? null;
}
