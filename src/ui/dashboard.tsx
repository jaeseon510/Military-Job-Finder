"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowSquareOutIcon, ArticleIcon, BellIcon, CalendarBlankIcon, CaretDownIcon, CheckCircleIcon, ClockIcon, CopyIcon, DatabaseIcon, FunnelIcon, GearSixIcon, HouseIcon, InfoIcon, MagnifyingGlassIcon, ShieldCheckIcon, StarIcon, ProhibitIcon, ChatCircleIcon, XIcon, ArrowClockwiseIcon, CodeIcon } from "@phosphor-icons/react";
import { rules, statusLabels } from "../../config/rules";
import { inquiryText } from "../core/inquiry";
import type { Change, Dataset, MilitaryStatus, Role } from "../core/types";
import { koreaToday } from "../core/date";
import { classifyJob, jobGroup } from "../core/classify";

const statusTone: Record<MilitaryStatus, string> = { CONFIRMED_NEW_ENTRY: "green", LIKELY_NEW_ENTRY: "amber", CONDITIONAL_FUTURE: "blue", TRANSFER_ONLY: "gray", SUPPLEMENTARY_ONLY: "gray", RESEARCH_ONLY: "gray", NO_ACTIVE_TO: "red", UNKNOWN: "gray" };
const changes: Record<Change, string> = { NEW: "신규 공고", CLOSED: "접수 마감", REOPENED: "접수 재개", TO_CHANGED: "TO 변경", ENROLLED_CHANGED: "편입인원 변경", MILITARY_CHANGED: "병역조건·본문 변경", SALARY_CHANGED: "급여 변경", DEADLINE_CHANGED: "마감일 변경", CONTENT_CHANGED: "내용 변경" };
const flagLabels: Record<string, string> = { SI_RISK: "SI 검토 필요", PRODUCT_EVIDENCE: "자체 제품 근거", PRODUCT_UNKNOWN: "제품회사 확인 필요", COMPANY_SIZE_UNKNOWN: "직원 수 미확인", COMPANY_SIZE_REVIEW: "회사 규모 검토", DUTY_REVIEW: "직무 내용 검토", TO_CONFLICT: "TO 수치 확인 필요" };
const answers = { yes: "yes", no: "no", unknown: "unknown" };
const formatTime = (value: string) => value ? new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value)) : "수집 전";

function Badge({ status }: { status: MilitaryStatus }) { return <span className={`badge ${statusTone[status]}`}><span className="status-dot" />{statusLabels[status]}</span>; }

export function Dashboard({ dataset, mode }: { dataset: Dataset; mode: "jobs" | "review" | "excluded" }) {
  const page = {
    jobs: { title: "현역 신규편입 공고 찾기", description: "현역 산업기능요원 신규편입 개발 공고만 한눈에", list: "공고 목록" },
    review: { title: "검토 대기 공고", description: "정보가 부족한 공고를 따로 보관합니다 · 지원 가능으로 확정하지 않습니다", list: "정보 부족 · 검토 대기" },
    excluded: { title: "제외 공고 검토", description: "명확한 제외 근거를 확인하고, 놓친 가능성을 검토하세요", list: "자동 제외 공고" },
  }[mode];
  const [query, setQuery] = useState("");
  const [statuses, setStatuses] = useState<MilitaryStatus[]>([...rules.defaultStatuses]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [sort, setSort] = useState("recommended");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saved, setSaved] = useState<string[]>([]);
  const [trackedOnly, setTrackedOnly] = useState(false);
  const [settings, setSettings] = useState(false);
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [excludedReason, setExcludedReason] = useState("all");
  const [now, setNow] = useState(() => dataset.generatedAt ? Date.parse(dataset.generatedAt) : 0);
  const today = koreaToday(new Date(now));
  const [displayCount, setDisplayCount] = useState(8);

  useEffect(() => {
    const timer = setTimeout(() => setNow(Date.now()), 0);
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => { clearTimeout(timer); clearInterval(interval); };
  }, []);

  useEffect(() => {
    try {
      const stored: unknown = JSON.parse(localStorage.getItem("mjf-tracked-companies") || "[]");
      if (Array.isArray(stored) && stored.every(value => typeof value === "string")) {
        // 브라우저에 저장된 추적 기업을 불러옵니다.
        const timer = setTimeout(() => setSaved(stored), 0);
        return () => clearTimeout(timer);
      }
    } catch { /* 저장소가 제한되어도 조회할 수 있습니다. */ }
  }, []);
  useEffect(() => { if (toast) { const timer = setTimeout(() => setToast(""), 3500); return () => clearTimeout(timer); } }, [toast]);
  useEffect(() => {
    if (!settings && !inquiryOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") { setSettings(false); setInquiryOpen(false); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [settings, inquiryOpen]);

  const currentJobs = useMemo(() => dataset.jobs.map(job => ({ ...job, ...classifyJob(job, new Date(now)) })), [dataset, now]);
  const visibleJobs = useMemo(() => currentJobs.filter(job => {
    if (jobGroup(job) !== mode) return false;
    if (mode === "jobs" && !statuses.includes(job.military.status)) return false;
    if (roles.length && !roles.some(role => job.roles.includes(role))) return false;
    if (regions.length && !regions.some(region => job.location.startsWith(region))) return false;
    if (trackedOnly && !saved.includes(job.companyCode)) return false;
    if (excludedReason !== "all" && mode !== "jobs" && !(mode === "review" ? job.reviewReasons : job.exclusionReasons).some(reason => reason.includes(excludedReason))) return false;
    return !query || [job.companyName, job.title, job.duties, job.remarks, ...job.keywords].join(" ").toLowerCase().includes(query.toLowerCase());
  }).sort((a, b) => sort === "deadline" ? (a.deadline || "9999").localeCompare(b.deadline || "9999") : sort === "latest" ? b.firstSeenAt.localeCompare(a.firstSeenAt) : b.score - a.score || b.firstSeenAt.localeCompare(a.firstSeenAt)), [currentJobs, mode, statuses, roles, regions, trackedOnly, saved, excludedReason, query, sort]);
  const selected = visibleJobs.find(job => job.id === selectedId) || visibleJobs[0];
  const eligible = currentJobs.filter(job => jobGroup(job) === "jobs");
  const reviewCount = currentJobs.filter(job => jobGroup(job) === "review").length;
  const lastCheck = dataset.report?.completedAt || dataset.generatedAt;
  const stale = !!lastCheck && now - Date.parse(lastCheck) > 36 * 60 * 60 * 1000;
  const toggle = <T,>(values: T[], value: T) => values.includes(value) ? values.filter(entry => entry !== value) : [...values, value];

  function track(code: string) {
    const next = toggle(saved, code);
    setSaved(next);
    try { localStorage.setItem("mjf-tracked-companies", JSON.stringify(next)); }
    catch { setToast("이 브라우저에서 추적 목록을 저장할 수 없습니다."); }
  }
  function selectJob(id: string) {
    setSelectedId(id);
    document.getElementById("job-detail")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  async function copyInquiry() {
    try { await navigator.clipboard.writeText(inquiryText); setToast("병역조건 문의문을 복사했습니다."); }
    catch { setInquiryOpen(true); setToast("아래 문의문을 선택해서 복사해 주세요."); }
  }
  function reset() { setQuery(""); setStatuses([...rules.defaultStatuses]); setRoles([]); setRegions([]); setTrackedOnly(false); setExcludedReason("all"); }

  return <div className="app-shell">
    <aside className="sidebar" aria-label="주 메뉴">
      <Link href="/jobs" className="side-brand" aria-label="Military Job Finder 홈"><ShieldCheckIcon size={30} weight="fill" /><span>MILITARY<br /><b>JOB FINDER</b></span></Link>
      <nav>
        <Link href="/jobs" className={mode === "jobs" && !trackedOnly ? "nav-item active" : "nav-item"}><HouseIcon size={24} weight={mode === "jobs" ? "fill" : "regular"} />대시보드</Link>
        <Link href={mode === "jobs" ? "#job-list" : "/jobs"} className="nav-item" onClick={() => setTrackedOnly(false)}><ArticleIcon size={24} />공고 목록</Link>
        <button className={`nav-item ${trackedOnly ? "active" : ""}`} onClick={() => { setTrackedOnly(!trackedOnly); setSelectedId(null); }}><StarIcon size={24} weight={trackedOnly ? "fill" : "regular"} />추적 기업 <span className="nav-count">{saved.length}</span></button>
        <Link href="/review" className={`nav-item ${mode === "review" ? "active" : ""}`}><InfoIcon size={24} />검토 대기 <span className="nav-count">{reviewCount}</span></Link>
        <Link href="/excluded" className={`nav-item ${mode === "excluded" ? "active" : ""}`}><ProhibitIcon size={24} />제외 공고</Link>
        <button className="nav-item" onClick={() => setSettings(true)}><GearSixIcon size={24} />기준 설정</button>
      </nav>
      <div className="sidebar-note"><ShieldCheckIcon size={24} /><p>복무의 시작을,<br />개발 경력의 시작으로.</p><small>가능성을 찾고, 조건은 확인하세요.</small></div>
      <a className="repo-link" href="https://github.com/jaeseon510/Military-Job-Finder" target="_blank" rel="noreferrer">Military Job Finder <ArrowSquareOutIcon size={13} /></a>
    </aside>

    <div className="workspace">
      <header className="topbar">
        <div className="page-title"><div className="shield-mark"><ShieldCheckIcon size={32} weight="fill" /></div><div><h1>{page.title}</h1><p>{page.description}</p></div></div>
        <div className="topbar-right"><span>좋은 기회를 빠르게, 더 나은 내일을 위해.</span><button className="icon-button" title="수집 상태 확인" aria-label="수집 상태 확인" onClick={() => setToast(dataset.report ? `마지막 수집 ${formatTime(lastCheck)} · ${dataset.report.updated}개 확인 · 오류 ${dataset.report.errors.length}개` : "아직 완료된 수집 이력이 없습니다.")}><BellIcon size={21} /></button></div>
      </header>

      <main>
        <div className="filter-bar">
          <div className="filter-chips">
            {mode === "jobs" && (rules.defaultStatuses).map(status => <button key={status} aria-pressed={status === "CONFIRMED_NEW_ENTRY" ? statuses.length === 1 && statuses[0] === status : statuses.includes(status)} className={`filter-chip status-filter ${statuses.includes(status) ? "selected" : ""}`} onClick={() => setStatuses(status === "CONFIRMED_NEW_ENTRY" ? statuses.length === 1 && statuses[0] === status ? [...rules.defaultStatuses] : [status] : toggle(statuses, status))}><span className={`status-dot ${statusTone[status]}`} />{status === "CONFIRMED_NEW_ENTRY" ? "신규편입 확정만" : status === "LIKELY_NEW_ENTRY" ? "문의필요 포함" : "조건부"}</button>)}
            {mode !== "jobs" && <label className="reason-select"><FunnelIcon size={16} /><select aria-label={mode === "review" ? "검토 사유" : "제외 사유"} value={excludedReason} onChange={event => setExcludedReason(event.target.value)}><option value="all">{mode === "review" ? "모든 검토 사유" : "모든 제외 사유"}</option>{(mode === "review" ? ["현역", "TO", "개발직", "신입", "근무지", "DevOps", "접수기간"] : ["전직", "보충역", "전문연구", "경력", "제외 직무", "지역", "TO", "마감", "직원"]).map(reason => <option key={reason} value={reason}>{reason}</option>)}</select></label>}
            <span className="filter-separator" />
            {(Object.keys(rules.roles) as Role[]).map(role => <button aria-pressed={roles.includes(role)} className={`filter-chip ${roles.includes(role) ? "selected" : ""}`} key={role} onClick={() => setRoles(toggle(roles, role))}>{role}</button>)}
            <span className="filter-separator" />
            {rules.regions.map(region => <button aria-pressed={regions.includes(region)} key={region} className={`filter-chip ${regions.includes(region) ? "selected" : ""}`} onClick={() => setRegions(toggle(regions, region))}>{region}</button>)}
          </div>
          <label className="search"><MagnifyingGlassIcon size={22} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="회사명, 직무, 키워드로 검색하세요..." aria-label="공고 검색" /></label>
        </div>

        <div className="stats-grid">
          <Stat icon={<CalendarBlankIcon size={28} />} label="오늘 신규" value={eligible.filter(job => koreaToday(new Date(job.firstSeenAt)) === today).length} tone="blue" hint="지원 검토 대상" />
          <Stat icon={<ChatCircleIcon size={28} />} label="문의 필요" value={eligible.filter(job => job.military.status === "LIKELY_NEW_ENTRY").length} tone="amber" hint="신규편입 확인 필요" />
          <Stat icon={<InfoIcon size={29} />} label="검토 대기" value={reviewCount} tone="amber" hint="정보 부족 · 별도 보관" />
          <Stat icon={<ProhibitIcon size={29} />} label="제외 공고" value={currentJobs.filter(job => job.excluded).length} tone="red" hint="제외 근거 저장됨" />
        </div>



        <section className="panel jobs-panel" id="job-list" aria-labelledby="list-title">
          <div className="panel-header"><div><h2 id="list-title">{trackedOnly ? "추적 기업의 공고" : page.list}</h2>{mode !== "jobs" && <p>{mode === "review" ? "언급이 없거나 근거가 부족한 항목을 확인하세요. 명확한 제외 사유가 있으면 제외 목록에 보관합니다." : "제외 사유를 클릭해 원문 근거를 검토하세요."}</p>}</div><div className="list-controls"><span>총 <b>{visibleJobs.length}</b>개의 공고</span><div className="sort-select"><select value={sort} onChange={event => setSort(event.target.value)} aria-label="공고 정렬"><option value="recommended">추천순</option><option value="latest">발견 최신순</option><option value="deadline">마감 임박순</option></select><CaretDownIcon size={15} /></div></div></div>
          <div className="table-scroll"><table className="job-table"><thead><tr><th>회사 / 공고</th><th>직무</th><th>병역 판정</th><th>TO <span className="table-muted">배정·편입</span></th><th>경력</th><th>급여</th><th>{mode === "jobs" ? "마감일" : mode === "review" ? "확인 필요" : "제외 이유"}</th><th>추적</th></tr></thead><tbody>
            {visibleJobs.slice(0, displayCount).map(job => <tr key={job.id} className={selected?.id === job.id ? "selected-row" : ""}>
              <td><button className="job-title-button" onClick={() => selectJob(job.id)} aria-pressed={selected?.id === job.id} aria-controls="job-detail"><strong>{job.companyName}</strong><span title={job.title}>{job.title}</span></button></td>
              <td><span className="role-text">{job.roles.join(" · ") || "직무 미확인"}</span><small className="job-location" title={job.location}>{job.location.split(" ").slice(0, 2).join(" ")}</small></td>
              <td><Badge status={job.military.status} /></td>
              <td className="quota">{job.activeAssigned ?? "?"}<span> · </span>{job.activeEnrolled ?? "?"}</td>
              <td>{job.experience || "미확인"}</td>
              <td>{job.salary || "미공개"}</td>
              <td>{mode !== "jobs" ? <button className={`excluded-reason ${mode === "review" ? "review-reason" : ""}`} onClick={() => selectJob(job.id)}>{(mode === "review" ? job.reviewReasons : job.exclusionReasons)[0]}</button> : <><span>{job.deadline || job.applicationPeriod || "확인 필요"}</span><small className="last-check">확인 {formatTime(job.lastSeenAt)}</small></>}</td>
              <td><button className={`star-button ${saved.includes(job.companyCode) ? "saved" : ""}`} aria-label={`${job.companyName} 추적 ${saved.includes(job.companyCode) ? "해제" : "추가"}`} aria-pressed={saved.includes(job.companyCode)} onClick={() => track(job.companyCode)}><StarIcon size={21} weight={saved.includes(job.companyCode) ? "fill" : "regular"} /></button></td>
            </tr>)}
          </tbody></table></div>
          {!visibleJobs.length && <div className="empty-state"><div className="empty-icon"><MagnifyingGlassIcon size={34} /></div><h3>{dataset.jobs.length ? "조건에 맞는 공고가 아직 없습니다" : "첫 번째 수집을 기다리고 있어요"}</h3><p>{dataset.jobs.length ? "필터를 조정하거나 검토 대기·제외 공고에서 판정 근거를 확인해 보세요." : "공개 채용공고를 수집하면 이곳에 지원 검토 대상이 표시됩니다."}</p><div><button className="secondary-button" onClick={reset}>필터 초기화</button>{mode === "jobs" && <Link className="primary-button" href="/review">검토 대기 확인 <ArrowSquareOutIcon size={15} /></Link>}</div></div>}
          {visibleJobs.length > displayCount && <div className="load-more"><button className="secondary-button" onClick={() => setDisplayCount(displayCount + 20)}>공고 더 보기 ({visibleJobs.length - displayCount}개 남음)</button></div>}
        </section>

        <div className="bottom-grid">
          <section className="panel guide-panel"><h2><ArticleIcon size={23} />판정 이유</h2><ol><li><span>1</span><div><strong>현역 신규편입 명시 + 유효한 공고</strong><p>원문에 신규편입이 명시된 경우. 실제 TO와 개인 자격은 별도로 확인해요.</p></div></li><li><span>2</span><div><strong>현역 TO는 있으나 신규편입 문구 미확인</strong><p>잔여 인원만으로 신규편입을 확정하지 않아요. 회사 문의가 필요해요.</p></div></li><li><span>3</span><div><strong>향후 TO는 조건부 · 전직/보충역은 제외</strong><p>다음년도 배정 예정은 현재 지원 가능 공고로 안내하지 않아요.</p></div></li></ol></section>
          <section className="panel inquiry-panel"><div className="inquiry-header"><h2><ChatCircleIcon size={24} />병역조건 문의문 복사</h2><button className="primary-button" onClick={copyInquiry}><CopyIcon size={17} />문의문 복사</button></div><p>아래 문구를 복사해서 채용 담당자에게 문의해 보세요.</p><button className="inquiry-preview" onClick={() => setInquiryOpen(true)} aria-label="병역조건 문의문 전체 보기">안녕하세요.<br />현역 산업기능요원 신규편입 관련하여 문의드립니다.<br />신규편입·실제 TO·우선배정 조건 확인 부탁드립니다.<span>문의문 전체 보기 <ArrowSquareOutIcon size={13} /></span></button></section>
        </div>
        {selected && <section className="panel detail-panel" id="job-detail" aria-label="선택 공고 상세">
          <div className="detail-heading"><div><span className="eyebrow">선택한 공고 · {selected.id}</span><h2>{selected.title}</h2><p>{selected.companyName} · {selected.location}</p></div><a className="primary-button" href={selected.url} target="_blank" rel="noreferrer">병역일터 원문 <ArrowSquareOutIcon size={16} /></a></div>
          <div className={`verdict-box ${statusTone[selected.military.status]}`}><Badge status={selected.military.status} /><p>{selected.military.reason}</p></div>
          <div className="detail-grid"><div><h3><CodeIcon size={18} />포지션 정보</h3><dl><dt>담당업무</dt><dd>{selected.duties || "미확인"}</dd><dt>경력 / 학력</dt><dd>{selected.experience} / {selected.education || "미확인"}</dd><dt>급여 / 접수기간</dt><dd>{selected.salary || "미공개"} / {selected.applicationPeriod || "미확인"}</dd><dt>요원 / 고용형태</dt><dd>{selected.serviceType} / {selected.employmentType}</dd><dt>업종 / 직원 수</dt><dd>{selected.industry || "미확인"} / {selected.employeeCount === null ? "미확인" : `${selected.employeeCount}명`}</dd></dl><div className="keyword-list">{selected.keywords.map(word => <span key={word}>{word}</span>)}</div></div>
          <div><h3><ShieldCheckIcon size={18} />병역조건 확인</h3><dl><dt>현역 배정 / 편입</dt><dd>{selected.activeAssigned ?? "미확인"} / {selected.activeEnrolled ?? "미확인"}</dd><dt>보충역 배정 / 편입</dt><dd>{selected.supplementaryAssigned ?? "미확인"} / {selected.supplementaryEnrolled ?? "미확인"}</dd><dt>TO_AVAILABLE</dt><dd>{answers[selected.military.toAvailable]} <small>· 공개 수치 기준</small></dd><dt>NEW_ENTRY_ALLOWED</dt><dd>{answers[selected.military.newEntryAllowed]}</dd><dt>USER_ELIGIBILITY</dt><dd>unknown</dd><dt>전직자 채용가능</dt><dd>{answers[selected.transferAllowed]} <small>· 신규편입 여부와 별개</small></dd></dl><p className="eligibility-note"><InfoIcon size={16} />{selected.military.eligibilityNote}</p></div></div>
          {!!selected.flags.length && <div className="flag-list">{selected.flags.map(flag => <span key={flag}>{flagLabels[flag] || flag} <small>{flag}</small></span>)}</div>}
          {!!selected.reviewReasons.length && <div className="exclusion-list review-list"><strong>확인 필요한 정보</strong><ul>{selected.reviewReasons.map(reason => <li key={reason}>{reason}</li>)}</ul></div>}
          {!!selected.exclusionReasons.length && <div className="exclusion-list"><strong>제외 이유</strong><ul>{selected.exclusionReasons.map(reason => <li key={reason}>{reason}</li>)}</ul></div>}
          <details><summary>원문 텍스트 및 변경 이력 보기</summary><div className="history-list">{selected.changes.map((entry, index) => <div key={`${entry.at}-${index}`}><time>{formatTime(entry.at)}</time>{entry.types.map(type => <span key={type}>{changes[type]}</span>)}</div>)}</div><pre className="raw-text">{selected.rawText}</pre></details>
          <div className="detail-footer"><span><ClockIcon size={14} />마지막 확인 {formatTime(selected.lastSeenAt)}</span><button className="primary-button" onClick={copyInquiry}><CopyIcon size={17} />병역조건 문의문 복사</button></div>
        </section>}

        <div className={`source-status ${stale ? "stale" : ""}`}><span><span className="status-dot blue" />병역일터 공개 채용공고 <span className="status-divider">|</span> {dataset.jobs.length}개 수집 {dataset.report && !dataset.report.complete && "· 일부 수집"}</span><span><ClockIcon size={14} />{stale ? "오래된 정보 · 원문 재확인 필요" : "마지막 확인"} {formatTime(lastCheck)} <button className="text-button" onClick={reset}><ArrowClockwiseIcon size={13} />필터 초기화</button></span></div>
        <footer className="page-footer"><span><DatabaseIcon size={14} />출처: 병무청 산업지원 병역일터 공개정보</span><span>판정은 지원 자격을 보장하지 않습니다 · 회사/병무청 확인 필요</span></footer>
      </main>
    </div>

    {toast && <div className="toast" role="status"><CheckCircleIcon size={19} />{toast}</div>}
    {settings && <Modal title="기준 설정" onClose={() => setSettings(false)}><p>기준은 한 파일에 모아두었습니다. 수정 후 기존 공고를 다시 분류할 수 있어요.</p><dl className="settings-list"><dt>희망 직무</dt><dd>{Object.keys(rules.roles).join(" · ")}</dd><dt>지역</dt><dd>{rules.regions.join(" · ")}</dd><dt>경력</dt><dd>신입 또는 경력무관</dd><dt>우선 회사</dt><dd>자체 제품 · SaaS · 직원 {rules.preferredEmployeeCount}명 이상</dd><dt>조건부 허용</dt><dd>30~49명 제품회사 · 직원 수 미확인은 검토 표시</dd><dt>연봉 하한</dt><dd>없음</dd></dl><div className="config-instructions"><code>config/rules.ts</code><p>기준 변경 후 <code>pnpm classify</code> → <code>pnpm build</code></p><code>config/collector.ts</code><p>수집 범위·주기·요청 간격</p><code>src/collector/selectors.ts</code><p>병역일터 HTML 구조 변경 대응</p></div><a className="primary-button" href="https://github.com/jaeseon510/Military-Job-Finder/blob/develop/config/rules.ts" target="_blank" rel="noreferrer">GitHub에서 기준 파일 보기 <ArrowSquareOutIcon size={16} /></a><p className="muted">웹 화면의 필터와 추적 기업은 이 브라우저에서만 적용됩니다. SI는 자동 제외하지 않고 검토 대상으로 표시합니다.</p></Modal>}
    {inquiryOpen && <Modal title="병역조건 문의문" onClose={() => setInquiryOpen(false)}><textarea aria-label="복사할 병역조건 문의문" readOnly value={inquiryText} onFocus={event => event.currentTarget.select()} rows={14} /><button className="primary-button" onClick={copyInquiry}><CopyIcon size={17} />문의문 복사</button></Modal>}
  </div>;
}

function Stat({ icon, label, value, tone, hint }: { icon: React.ReactNode; label: string; value: number; tone: string; hint: string }) { return <section className="stat-card"><div className={`stat-icon ${tone}`}>{icon}</div><div><h2>{label}</h2><strong className={tone}>{value}</strong></div><small>{hint}</small></section>; }

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLDialogElement>("dialog");
    dialog?.showModal();
    return () => { dialog?.close(); previous?.focus(); };
  }, []);
  return <dialog className="modal" onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === event.currentTarget) onClose(); }}><div className="modal-heading"><h2>{title}</h2><button autoFocus className="icon-button" onClick={onClose} aria-label="닫기"><XIcon size={22} /></button></div>{children}</dialog>;
}
