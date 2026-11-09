"use client";
import { useFeedback } from "@/components/feedback";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Crown, Gift, History, ArrowRight, RefreshCw, Star, Award, Sparkles, CheckCircle2, Calculator, PlusCircle, MinusCircle, Clock, LogIn } from "lucide-react";
import Link from "@/components/ui-loader/navigation-link";
import { useSession } from "@/components/auth/use-session";
import { useLocaleTools } from "@/lib/i18n/hooks";
import { loyaltyApi, type LoyaltyOverview, type LoyaltyPolicy } from "@/lib/loyalty";
import styles from "./loyalty.module.css";

export default function LoyaltyPage() {
  const t = useTranslations("loyalty");
  const { money, number, date } = useLocaleTools();
  const { user, ready, error: sessionError } = useSession();
  const userId = user?.userId;
  const [loaded, setLoaded] = useState<{ userId: number; data: LoyaltyOverview } | null>(null);
  const [policy, setPolicy] = useState<LoyaltyPolicy | null>(null);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState("ALL");
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useFeedback(error && t("error"));
  const [spend, setSpend] = useState(250000);
  const data = loaded?.userId === user?.userId ? loaded?.data : null;
  const points = data?.points;
  const currentPolicy = data?.policy ?? policy;
  useEffect(() => { setPage(0); setLoaded(null); }, [user?.userId]);
  useEffect(() => {
    if (!ready) return;
    let active = true;
    setLoading(true); setError(false);
    const work = userId !== undefined ? loyaltyApi.me(page, filter).then(result => {
      if (active) { setLoaded({ userId, data: result }); setPolicy(result.policy); }
    }) : loyaltyApi.policy().then(result => { if (active) setPolicy(result); });
    work.catch(() => { if (active) { setError(true); setLoaded(null); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [ready, userId, page, filter, reload]);
  const nextThreshold = currentPolicy && points ? points.tier === "GOLD" ? null : points.tier === "SILVER" ? currentPolicy.goldThreshold : currentPolicy.silverThreshold : null;
  const progress = points && nextThreshold ? Math.min(100, points.lifetimePoints / nextThreshold * 100) : 100;
  const tierCards = [
    { tier: "MEMBER", Icon: Star, badge: styles.tierBadgeMember },
    { tier: "SILVER", Icon: Award, badge: styles.tierBadgeSilver },
    { tier: "GOLD", Icon: Crown, badge: styles.tierBadgeGold },
  ] as const;
  const currentTier = tierCards.find(card => card.tier === points?.tier);
  const estimatedPoints = currentPolicy ? Math.floor(spend / currentPolicy.spendPerPoint) : 0;
  return <main className={styles.container}>
    <header className={styles.hero}>
      <span className={styles.heroTag}><Sparkles size={14} aria-hidden="true" /> Clucky Club</span>
      <h1 className={styles.heroTitle}>{t("title")}</h1>
      <p className={styles.heroDesc}>{t("intro")}</p>
    </header>

    {(loading || !ready) && <p className={styles.loadingStatus} role="status">{t("loading")}</p>}
    {(error || sessionError) && <div className={styles.statusCard} role="alert">
      <p>{t("error")}</p>
      <button className={styles.historyJumpBtn} onClick={() => sessionError ? window.location.reload() : setReload(value => value + 1)}><RefreshCw size={16} aria-hidden="true" />{t("retry")}</button>
    </div>}
    {ready && !user && !sessionError && <section className={styles.guestBanner}>
      <div className={styles.guestLeft}><div className={styles.guestIconWrap}><Gift size={26} aria-hidden="true" /></div><div><h2 className={styles.guestTitle}>{t("guestTitle")}</h2><p className={styles.guestDesc}>{t("guestText")}</p></div></div>
      <Link href="/login?redirect=/loyalty" className={styles.loginBtn}><LogIn size={16} aria-hidden="true" />{t("login")}</Link>
    </section>}

    {points && currentPolicy && currentTier && !error && <section className={styles.statusCard} aria-busy={loading} aria-label={t("available")}>
      <div className={styles.statusHeader}>
        <div className={styles.pointsBigWrap}>
          <span className={styles.pointsLabel}>{t("available")}</span>
          <div className={styles.pointsBigVal}>{number(points.availablePoints)}<span className={styles.pointsUnit}>{t("points")}</span></div>
          <div className={styles.equivalentVal}><CheckCircle2 size={15} aria-hidden="true" /><span>{t("equivalent", { amount: money(points.availablePoints * currentPolicy.pointValue) })}</span></div>
        </div>
        <span className={styles.tierBadgeHero + " " + currentTier.badge}><currentTier.Icon size={18} aria-hidden="true" />{t(points.tier)}</span>
      </div>
      <div className={styles.progressSection}>
        <div className={styles.progressLabelRow}><span>{t("progress")}</span><span>{nextThreshold ? t("remaining", { points: number(Math.max(0, nextThreshold - points.lifetimePoints)) }) : t("maxTier")}</span></div>
        <div className={styles.progressTrack} role="progressbar" aria-label={t("progress")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><div className={styles.progressFill} style={{ width: progress + "%" }} /></div>
      </div>
      <dl className={styles.balanceMetrics}>
        <div><dt>{t("lifetime")}</dt><dd>{number(points.lifetimePoints)}</dd></div>
        <div><dt>{t("reserved")}</dt><dd>{number(points.reservedPoints)}</dd></div>
        <div><dt>{t("total")}</dt><dd>{number(points.totalPoints)}</dd></div>
      </dl>
      <div className={styles.statusBarFooter}>
        <p className={styles.balanceHint}>{t("heldHint")}</p>
        <div className={styles.statusActions}><a href="#loyalty-history" className={styles.historyJumpBtn}><History size={15} aria-hidden="true" />{t("history")}</a><Link href="/menu" className={styles.orderNowBtn}>{t("order")}<ArrowRight size={15} aria-hidden="true" /></Link></div>
      </div>
    </section>}

    {currentPolicy && <>
      <section aria-labelledby="loyalty-tiers">
        <div className={styles.sectionTitleRow}><h2 id="loyalty-tiers" className={styles.sectionTitle}>{t("benefits")}</h2><p className={styles.sectionSub}>{t("tiersIntro")}</p></div>
        <div className={styles.tierGrid}>{tierCards.map(({ tier, Icon, badge }) => {
          const selected = points?.tier === tier;
          const discount = tier === "GOLD" ? currentPolicy.goldDiscount : tier === "SILVER" ? currentPolicy.silverDiscount : 0;
          return <article key={tier} data-tier={tier} className={styles.tierCard + (selected ? " " + styles.tierCardCurrent : "")}>
            {selected && <span className={styles.currentBadge}>{t("currentTier")}</span>}
            <div className={styles.tierHeader}><h3 className={styles.tierTitle}>{t(tier)}</h3><span className={styles.tierBadgeHero + " " + badge}><Icon size={21} aria-hidden="true" /></span></div>
            <div className={styles.tierPointsReq}>{t("threshold", { points: number(tier === "GOLD" ? currentPolicy.goldThreshold : tier === "SILVER" ? currentPolicy.silverThreshold : 0) })}</div>
            <div className={styles.tierDiscountCallout}>{tier === "MEMBER" ? t("earnRate", { amount: money(currentPolicy.spendPerPoint) }) : t("discount", { percent: discount })}</div>
            <ul className={styles.tierBenefitsList}>
              {tier !== "MEMBER" && <li className={styles.tierBenefitItem}><CheckCircle2 size={15} className={styles.tierCheckIcon} aria-hidden="true" /><span>{t("earnRate", { amount: money(currentPolicy.spendPerPoint) })}</span></li>}
              <li className={styles.tierBenefitItem}><CheckCircle2 size={15} className={styles.tierCheckIcon} aria-hidden="true" /><span>{t("redeemBenefit", { amount: money(currentPolicy.pointValue) })}</span></li>
              <li className={styles.tierBenefitItem}><CheckCircle2 size={15} className={styles.tierCheckIcon} aria-hidden="true" /><span>{t("keepTierBenefit")}</span></li>
            </ul>
          </article>;
        })}</div>
      </section>

      <section aria-labelledby="loyalty-how">
        <div className={styles.sectionTitleRow}><h2 id="loyalty-how" className={styles.sectionTitle}>{t("howTitle")}</h2><p className={styles.sectionSub}>{t("howIntro")}</p></div>
        <div className={styles.stepsGrid}>{["order", "earn", "redeem"].map((step, index) => <article className={styles.stepCard} key={step}><span className={styles.stepNumber}>{index + 1}</span><h3 className={styles.stepTitle}>{t("step_" + step)}</h3><p className={styles.stepDesc}>{t("step_" + step + "_text")}</p></article>)}</div>
      </section>

      <section className={styles.calcCard} aria-labelledby="loyalty-calculator">
        <div className={styles.calcHeader}><span className={styles.calcIconWrap}><Calculator size={21} aria-hidden="true" /></span><h2 id="loyalty-calculator" className={styles.sectionTitle}>{t("calculator")}</h2></div>
        <div className={styles.calcGrid}>
          <div className={styles.calcInputWrap}><label htmlFor="loyalty-spend">{t("eligibleAmount")}</label><input id="loyalty-spend" className={styles.spendInput} type="number" min={0} max={1000000000} step={1000} value={spend} onChange={event => setSpend(Math.min(1000000000, Math.max(0, Number(event.target.value) || 0)))} /><div className={styles.spendPresets}>{[100000, 200000, 350000, 500000].map(amount => <button key={amount} type="button" aria-pressed={spend === amount} onClick={() => setSpend(amount)}>{money(amount)}</button>)}</div></div>
          <div className={styles.calcOutputBox} aria-live="polite"><div className={styles.calcStatItem}><span className={styles.calcStatLabel}>{t("estimatedEarn")}</span><strong className={styles.calcStatVal}>+{number(estimatedPoints)} <small>{t("points")}</small></strong></div><div className={styles.calcStatItem}><span className={styles.calcStatLabel}>{t("rewardValue")}</span><strong className={styles.calcStatVal}>{money(estimatedPoints * currentPolicy.pointValue)}</strong></div></div>
        </div>
        <p className={styles.calculatorHint}>{t("estimateHint")}</p>
        <details className={styles.policyDetails}><summary>{t("rulesTitle")}</summary><p>{t("rules", { amount: money(currentPolicy.pointValue) })}</p></details>
      </section>
    </>}

    {user && <section id="loyalty-history" className={styles.historyCard} aria-busy={loading} aria-labelledby="loyalty-history-title">
      <div className={styles.historyToolbar}><h2 id="loyalty-history-title" className={styles.sectionTitle}><History size={22} aria-hidden="true" />{t("history")}</h2><button className={styles.historyJumpBtn} disabled={loading} onClick={() => setReload(value => value + 1)}><RefreshCw size={15} aria-hidden="true" />{t("refresh")}</button></div>
      <div className={styles.txFilterList} role="group" aria-label={t("filter")}>{["ALL", "EARN", "REDEEM", "ADJUST"].map(type => <button key={type} className={styles.txFilterBtn + (filter === type ? " " + styles.txFilterBtnActive : "")} aria-pressed={filter === type} onClick={() => { setFilter(type); setPage(0); }}>{t(type)}</button>)}</div>
      {!loading && !error && !data?.transactions.length && <div className={styles.emptyHistory}><History size={36} aria-hidden="true" /><p>{t("empty")}</p></div>}
      <div className={styles.txList}>{!error && data?.transactions.map(entry => <article className={styles.txItem} key={entry.id}>
        <div className={styles.txLeft}><span className={styles.txTypeIconWrap + " " + (entry.type === "EARN" ? styles.txEarnIcon : entry.type === "REDEEM" ? styles.txRedeemIcon : styles.txAdjustIcon)}>{entry.type === "EARN" ? <PlusCircle size={20} aria-hidden="true" /> : entry.type === "REDEEM" ? <MinusCircle size={20} aria-hidden="true" /> : <Sparkles size={20} aria-hidden="true" />}</span><div className={styles.txDetails}><strong className={styles.txReason}>{t(["RESERVED", "RELEASED", "REDEEMED", "EARNED", "OPENING_BALANCE"].includes(entry.reason ?? "") ? entry.reason! : entry.type)}</strong><span className={styles.txTime}><Clock size={12} aria-hidden="true" />{date(entry.createdAt, { dateStyle: "medium", timeStyle: "short" })}{entry.orderId && <Link href={"/orders/" + entry.orderId}>{t("orderRef", { id: entry.orderId })}</Link>}</span></div></div>
        <div className={styles.txRight}><strong className={entry.change > 0 ? styles.txChangeEarn : entry.change < 0 ? styles.txChangeRedeem : styles.txChangeAdjust}>{entry.change > 0 ? "+" : ""}{number(entry.change)} {t("points")}</strong><span className={styles.txBalanceAfter}>{t("after", { points: number(entry.balanceAfter) })}</span></div>
      </article>)}</div>
      {data && data.totalElements > 10 && <nav className={styles.pager} aria-label={t("pagination")}><button className={styles.historyJumpBtn} disabled={loading || page === 0} onClick={() => setPage(value => value - 1)}>{t("previous")}</button><span>{page + 1} / {Math.ceil(data.totalElements / data.size)}</span><button className={styles.historyJumpBtn} disabled={loading || (page + 1) * data.size >= data.totalElements} onClick={() => setPage(value => value + 1)}>{t("next")}</button></nav>}
    </section>}
  </main>;
}
