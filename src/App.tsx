import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDown, ArrowDownUp, ArrowUpRight, BarChart3, CalendarDays, Check,
  ChevronDown, ChevronLeft, ChevronRight, Command, Download,
  Filter, LayoutDashboard, ListFilter, Plus, Search,
  SlidersHorizontal, Sparkles, Users, X,
} from 'lucide-react'
import seed from './data/creators.json'
import './App.css'

type Creator = {
  number: number; code: string; name: string; platform: string; budgetCategory: string
  followers: number; audienceAge: string; audienceGeo: string; storyReach: number
  reelViews: number; placementCost: number; productCost: number; adFormat: string
  status: string; adDate: string; adLink: string; comment: string; cpm: number
}
type View = 'overview' | 'creators'
const seedCreators = seed as Creator[]
const STORAGE_KEY = 'zaum-creators-v1'
const statuses = ['Согласование', 'Запланировано', 'Опубликовано', 'Результаты получены']
const platforms = ['Telegram', 'VK', 'YouTube']
const statusColors: Record<string, string> = {
  'Согласование': 'amber', 'Запланировано': 'blue', 'Опубликовано': 'violet', 'Результаты получены': 'green',
}
const platformColors: Record<string, string> = { Telegram: '#3085f4', VK: '#7b61d1', YouTube: '#ed5f5b' }
const rub = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 })
const compact = new Intl.NumberFormat('ru-RU', { notation: 'compact', maximumFractionDigits: 1 })
const money = (n: number) => `${rub.format(n)} ₽`
const currentLocalDate = (() => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}` })()
const storedCreators = (): Creator[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) as Creator[] : seedCreators
  } catch { return seedCreators }
}
const save = (rows: Creator[]) => localStorage.setItem(STORAGE_KEY, JSON.stringify(rows))
const csvEscape = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`
const sourceFields: (keyof Creator)[] = ['number','code','name','platform','budgetCategory','followers','audienceAge','audienceGeo','storyReach','reelViews','placementCost','productCost','adFormat','status','adDate','adLink','comment','cpm']
const sourceLabels = ['№','Артикул','Блогер','Площадка','Категория бюджета','Подписчики','Возраст аудитории','Гео аудитории','Охват сторис','Просмотры рилс','Стоимость размещения, ₽','Себестоимость товара, ₽','Формат рекламы','Статус','Дата рекламы','Ссылка на рекламу','Комментарий','CPM, ₽']
const StatusChart = lazy(() => import('./components/StatusChart'))

function App() {
  const [rows, setRows] = useState<Creator[]>(storedCreators)
  const [view, setView] = useState<View>('overview')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('Все статусы')
  const [platformFilter, setPlatformFilter] = useState('Все площадки')
  const [categoryFilter, setCategoryFilter] = useState('Все категории')
  const [sort, setSort] = useState<keyof Creator>('adDate')
  const [ascending, setAscending] = useState(false)
  const [active, setActive] = useState<Creator | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Creator | null>(null)
  const [toast, setToast] = useState('')
  const [mobileMenu, setMobileMenu] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault(); setView('creators'); setMobileSearchOpen(true)
        window.setTimeout(() => searchInputRef.current?.focus(), 0)
      }
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [])

  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2600) }
  const commit = (next: Creator[], message: string) => { try { save(next); setRows(next); notify(message) } catch { notify('Не удалось сохранить данные в этом браузере') } }
  const totalSpend = rows.reduce((sum, row) => sum + Number(row.placementCost || 0), 0)
  const averageCpm = rows.length ? rows.reduce((sum, row) => sum + Number(row.cpm || 0), 0) / rows.length : 0
  const completed = rows.filter(row => row.status === 'Результаты получены').length
  const activeCount = rows.length - completed
  const statusData = statuses.map(status => ({ name: status, count: rows.filter(row => row.status === status).length, color: statusColors[status] }))
  const platformData = platforms.map(platform => ({ name: platform, count: rows.filter(row => row.platform === platform).length, spend: rows.filter(row => row.platform === platform).reduce((sum,row) => sum + row.placementCost, 0) }))

  const filteredRows = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('ru-RU')
    return rows.filter(row => {
      const textMatch = !q || [row.name,row.code,row.platform,row.budgetCategory,row.audienceAge,row.audienceGeo,row.adFormat,row.status,row.comment].some(value => String(value).toLocaleLowerCase('ru-RU').includes(q))
      return textMatch && (statusFilter === 'Все статусы' || row.status === statusFilter) && (platformFilter === 'Все площадки' || row.platform === platformFilter) && (categoryFilter === 'Все категории' || row.budgetCategory === categoryFilter)
    }).sort((a,b) => {
      const av = a[sort], bv = b[sort]
      const result = typeof av === 'number' && typeof bv === 'number' ? av-bv : String(av).localeCompare(String(bv),'ru')
      return ascending ? result : -result
    })
  }, [rows, search, statusFilter, platformFilter, categoryFilter, sort, ascending])

  const exportCsv = () => {
    const body = [sourceLabels, ...rows.map(row => sourceFields.map(field => row[field]))].map(line => line.map(csvEscape).join(';')).join('\r\n')
    const blob = new Blob(['\ufeff', body], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob); const link = document.createElement('a')
    link.href = url; link.download = 'zaum-blogery.csv'; link.click(); URL.revokeObjectURL(url)
    notify('CSV-файл подготовлен')
  }
  const openCreate = () => { setEditing(null); setFormOpen(true) }
  const openEdit = (row: Creator) => { setActive(null); setEditing(row); setFormOpen(true) }
  const submitCreator = (creator: Creator) => {
    if (editing) commit(rows.map(row => row.code === editing.code ? creator : row), 'Изменения сохранены')
    else commit([{ ...creator, number: Math.max(0, ...rows.map(row => row.number)) + 1 }, ...rows], 'Блогер добавлен')
    setFormOpen(false); setEditing(null)
  }
  const deleteCreator = (creator: Creator) => {
    if (!window.confirm(`Удалить запись «${creator.name}»?`)) return
    commit(rows.filter(row => row.code !== creator.code), 'Запись удалена'); setActive(null)
  }
  const quickStatus = (creator: Creator, status: string) => {
    const next = rows.map(row => row.code === creator.code ? { ...row, status } : row)
    commit(next, 'Статус обновлён'); setActive(next.find(row => row.code === creator.code) ?? null)
  }
  const resetFilters = () => { setSearch(''); setStatusFilter('Все статусы'); setPlatformFilter('Все площадки'); setCategoryFilter('Все категории') }
  const goCreators = (query = '') => { setView('creators'); setSearch(query); setMobileMenu(false) }

  return <div className="app-shell">
    <aside className={`sidebar ${mobileMenu ? 'sidebar-open' : ''}`}>
      <a className="brand" href="#overview" onClick={e => { e.preventDefault(); setView('overview'); setMobileMenu(false) }}><span className="brand-mark">z</span><span>zaum<span className="brand-light"> creators</span></span></a>
      <div className="workspace-label">РАБОЧЕЕ ПРОСТРАНСТВО</div>
      <div className="side-nav">
        <button className={`nav-item ${view === 'overview' ? 'selected' : ''}`} onClick={() => { setView('overview'); setMobileMenu(false) }}><LayoutDashboard size={18}/><span>Обзор</span></button>
        <button className={`nav-item ${view === 'creators' ? 'selected' : ''}`} onClick={() => goCreators()}><Users size={18}/><span>Блогеры</span><span className="nav-count">{rows.length}</span></button>
      </div>
      <div className="sidebar-bottom">
        <div className="workspace-card"><div className="workspace-avatar">Z</div><div><strong>ZAUM</strong><small>Демо-пространство</small></div><ChevronDown size={15}/></div>
        <div className="sidebar-note"><span className="online-dot"/> Данные сохранены локально</div>
      </div>
    </aside>
    {mobileMenu && <button className="mobile-scrim" onClick={() => setMobileMenu(false)} aria-label="Закрыть меню"/>}
    <main className="main-area">
      <header className="topbar">
        <button className="mobile-menu-button" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Открыть меню"><span/><span/><span/></button>
        <div className="breadcrumbs"><span>ZAUM</span><ChevronRight size={14}/><strong>{view === 'overview' ? 'Обзор' : 'Блогеры'}</strong></div>
        <div className="top-actions">
          <label className={`global-search ${mobileSearchOpen ? 'mobile-search-open' : ''}`} onClick={() => { if (window.innerWidth <= 760 && !mobileSearchOpen) { setMobileSearchOpen(true); window.setTimeout(() => searchInputRef.current?.focus(), 0) } }}><Search size={16}/><input ref={searchInputRef} value={search} onChange={e => { setSearch(e.target.value); if (e.target.value) setView('creators') }} placeholder="Найти блогера..."/><kbd><Command size={11}/> K</kbd></label>
          <button className="avatar-button" title="Демо-пространство">З</button>
        </div>
      </header>
      <div className="page-content">
        {view === 'overview' ? <>
          <div className="page-heading"><div><div className="eyebrow"><Sparkles size={14}/> РАБОЧИЙ ОБЗОР</div><h1>Всё по делу, <span>в одном месте.</span></h1><p>Сводка по размещениям и работе с блогерами.</p></div><button className="button button-primary" onClick={openCreate}><Plus size={17}/> Добавить блогера</button></div>
          <section className="metrics-grid">
            <MetricCard label="Всего блогеров" value={String(rows.length)} icon={<Users size={17}/>} foot="в демонстрационной базе" accent="coral"/>
            <MetricCard label="В работе" value={String(activeCount)} icon={<ArrowDownUp size={17}/>} foot="все, кроме полученных результатов" accent="blue"/>
            <MetricCard label="Результаты получены" value={String(completed)} icon={<Check size={17}/>} foot={rows.length ? `${Math.round(completed/rows.length*100)}% от всех записей` : 'нет записей'} accent="green"/>
            <MetricCard label="Стоимость размещений" value={money(totalSpend)} icon={<BarChart3 size={17}/>} foot="сумма по исходной таблице" accent="amber"/>
          </section>
          <section className="insights-grid">
            <article className="panel status-panel"><div className="panel-heading"><div><h2>Статусы размещений</h2><p>Текущий этап по каждой записи</p></div><button className="subtle-icon" aria-label="Открыть блогеров" onClick={() => goCreators()}><ArrowUpRight size={17}/></button></div>
              <div className="status-chart-wrap"><div className="status-chart"><Suspense fallback={<div className="chart-loading"/>}><StatusChart data={statusData}/></Suspense></div></div>
              <div className="status-legend">{statusData.map(item => <button key={item.name} onClick={() => { setStatusFilter(item.name); goCreators() }}><span className={`legend-dot ${item.color}`}/><span>{item.name}</span><strong>{item.count}</strong></button>)}</div>
            </article>
            <article className="panel channels-panel"><div className="panel-heading"><div><h2>Площадки</h2><p>Блогеры и бюджет по каналам</p></div><button className="subtle-icon" aria-label="Фильтр по площадкам" onClick={() => goCreators()}><SlidersHorizontal size={17}/></button></div>
              <div className="channel-list">{platformData.map(item => <button className="channel-row" key={item.name} onClick={() => { setPlatformFilter(item.name); goCreators() }}><span className="channel-logo" style={{'--platform-color':platformColors[item.name]} as React.CSSProperties}>{item.name === 'YouTube' ? '▶' : item.name === 'VK' ? 'ᴠκ' : '↗'}</span><span className="channel-name"><strong>{item.name}</strong><small>{item.count} блогеров</small></span><span className="channel-share"><span className="mini-track"><i style={{width:`${rows.length ? item.count/rows.length*100 : 0}%`,background:platformColors[item.name]}}/></span><small>{money(item.spend)}</small></span><ChevronRight size={15}/></button>)}</div>
              <div className="cpm-callout"><div className="cpm-icon"><BarChart3 size={17}/></div><div><small>СРЕДНИЙ CPM</small><strong>{Math.round(averageCpm).toLocaleString('ru-RU')} ₽</strong></div><span>по исходным данным</span></div>
            </article>
          </section>
          <section className="panel recent-panel"><div className="panel-heading"><div><h2>Последние размещения</h2><p>Сортировка по дате рекламы из таблицы</p></div><button className="text-button" onClick={() => goCreators()}>Все блогеры <ArrowUpRight size={15}/></button></div>
            <div className="table-scroll overview-desktop-list"><table className="data-table overview-table"><thead><tr><th>БЛОГЕР</th><th>ПЛОЩАДКА</th><th>ФОРМАТ</th><th>СТАТУС</th><th>ДАТА РЕКЛАМЫ</th><th>СТОИМОСТЬ</th><th></th></tr></thead><tbody>{[...rows].sort((a,b) => b.adDate.localeCompare(a.adDate)).slice(0,5).map(row => <tr key={row.code} onClick={() => setActive(row)}><td><CreatorCell row={row}/></td><td><Platform name={row.platform}/></td><td className="muted-cell">{row.adFormat}</td><td><Status status={row.status}/></td><td className="date-cell"><CalendarDays size={14}/>{formatDate(row.adDate)}</td><td className="cost-cell">{money(row.placementCost)}</td><td><button className="row-arrow" aria-label="Открыть карточку"><ChevronRight size={16}/></button></td></tr>)}</tbody></table></div>
            <div className="mobile-recent-list">{[...rows].sort((a,b) => b.adDate.localeCompare(a.adDate)).slice(0,5).map(row => <button key={row.code} className="mobile-recent-card" onClick={() => setActive(row)}><div className="mobile-recent-top"><CreatorCell row={row}/><Status status={row.status}/></div><div className="mobile-recent-meta"><Platform name={row.platform}/><span>{row.adFormat}</span><span><CalendarDays size={12}/>{formatDate(row.adDate)}</span><strong>{money(row.placementCost)}</strong></div></button>)}</div>
          </section>
          <footer className="page-footer"><span>ZAUM Creators <b>·</b> данные для демонстрации</span><span>{rows.length} записей в базе</span></footer>
        </> : <>
          <div className="page-heading catalog-heading"><div><div className="eyebrow"><Users size={14}/> БАЗА КРЕАТОРОВ</div><h1>Блогеры</h1><p>Все размещения и результаты в одной базе.</p></div><div className="heading-buttons"><button className="button button-secondary" onClick={exportCsv}><Download size={16}/> Экспорт CSV</button><button className="button button-primary" onClick={openCreate}><Plus size={17}/> Добавить</button></div></div>
          <section className="catalog-toolbar"><label className="catalog-search"><Search size={17}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Имя, артикул, формат, комментарий..."/><kbd>⌘ K</kbd></label><div className="filter-controls"><span className="filter-caption"><Filter size={15}/> Фильтры</span><select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option>Все статусы</option>{statuses.map(x => <option key={x}>{x}</option>)}</select><select value={platformFilter} onChange={e => setPlatformFilter(e.target.value)}><option>Все площадки</option>{platforms.map(x => <option key={x}>{x}</option>)}</select><select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}><option>Все категории</option><option>Платное размещение</option><option>Бартер</option></select>{(search || statusFilter !== 'Все статусы' || platformFilter !== 'Все площадки' || categoryFilter !== 'Все категории') && <button className="clear-filters" onClick={resetFilters}><X size={14}/> Сбросить</button>}</div></section>
          <section className="panel catalog-panel"><div className="catalog-summary"><div><strong>{filteredRows.length}</strong> из {rows.length} блогеров <span className="summary-divider">·</span> {statusFilter !== 'Все статусы' ? statusFilter : 'Все статусы'}</div><label><ListFilter size={15}/><span>Сортировка</span><select value={sort} onChange={e => setSort(e.target.value as keyof Creator)}><option value="adDate">Дата рекламы</option><option value="followers">Подписчики</option><option value="placementCost">Стоимость</option><option value="cpm">CPM</option><option value="name">Имя</option></select><button className="sort-dir" onClick={() => setAscending(!ascending)} aria-label="Изменить направление сортировки">{ascending ? <ArrowDown size={14}/> : <ArrowDownUp size={14}/>}</button></label></div>
            {filteredRows.length ? <><div className="table-scroll"><table className="data-table catalog-table"><thead><tr><th>БЛОГЕР</th><th>ПЛОЩАДКА</th><th>КАТЕГОРИЯ</th><th>ПОДПИСЧИКИ</th><th>ОХВАТ СТОРИС</th><th>СТАТУС</th><th>ДАТА</th><th></th></tr></thead><tbody>{filteredRows.map(row => <tr key={row.code} onClick={() => setActive(row)}><td><CreatorCell row={row}/></td><td><Platform name={row.platform}/></td><td><span className={`category-pill ${row.budgetCategory === 'Бартер' ? 'barter' : ''}`}>{row.budgetCategory}</span></td><td className="numeric-cell">{compact.format(row.followers)}</td><td className="numeric-cell">{compact.format(row.storyReach)}</td><td><Status status={row.status}/></td><td className="date-cell"><CalendarDays size={14}/>{formatDate(row.adDate)}</td><td><button className="row-arrow" aria-label="Открыть карточку"><ChevronRight size={16}/></button></td></tr>)}</tbody></table></div><div className="mobile-creator-list">{filteredRows.map(row => <button className="mobile-creator-card" key={row.code} onClick={() => setActive(row)}><CreatorCell row={row}/><Status status={row.status}/><div className="mobile-card-meta"><Platform name={row.platform}/><span>{compact.format(row.followers)} подписчиков</span><span>{money(row.placementCost)}</span></div></button>)}</div></> : <div className="empty-state"><div className="empty-icon"><Search size={21}/></div><h3>Ничего не нашлось</h3><p>Попробуйте изменить запрос или сбросить фильтры.</p><button className="button button-secondary" onClick={resetFilters}>Сбросить фильтры</button></div>}
            <div className="table-footer"><span>Показано {filteredRows.length} из {rows.length} записей</span><div><button disabled aria-label="Предыдущая страница"><ChevronLeft size={16}/></button><span>1</span><button disabled aria-label="Следующая страница"><ChevronRight size={16}/></button></div></div>
          </section>
          <footer className="page-footer"><span>Источник: копия демонстрационной таблицы Google Sheets</span><span>Изменения сохраняются в этом браузере</span></footer>
        </>}
      </div>
    </main>
    {active && <CreatorDrawer creator={rows.find(row => row.code === active.code) ?? active} onClose={() => setActive(null)} onEdit={openEdit} onDelete={deleteCreator} onStatus={quickStatus}/>}
    {formOpen && <CreatorForm creator={editing} rows={rows} onClose={() => setFormOpen(false)} onSubmit={submitCreator}/>}
    {toast && <div className="toast"><span><Check size={15}/></span>{toast}</div>}
  </div>
}

function MetricCard({label,value,icon,foot,accent}:{label:string;value:string;icon:React.ReactNode;foot:string;accent:string}) { return <article className="metric-card"><div className="metric-top"><span>{label}</span><span className={`metric-icon ${accent}`}>{icon}</span></div><strong className="metric-value">{value}</strong><div className="metric-foot"><span className="metric-spark">↗</span>{foot}</div></article> }
function CreatorCell({row}:{row:Creator}) { const initials = row.name.startsWith('Блогер ') ? row.name.slice(-2) : row.name.trim().split(/\s+/).slice(0,2).map(part=>part[0]).join('').toLocaleUpperCase('ru-RU'); return <div className="creator-cell"><div className={`creator-avatar avatar-${platformColors[row.platform] === '#3085f4' ? 'tg' : row.platform === 'VK' ? 'vk' : 'yt'}`}>{initials}</div><div><strong>{row.name}</strong><small>{row.code}</small></div></div> }
function Platform({name}:{name:string}) { return <span className="platform-label"><i style={{background:platformColors[name]}}/>{name}</span> }
function Status({status}:{status:string}) { return <span className={`status-badge ${statusColors[status] ?? 'gray'}`}><i/>{status}</span> }
function formatDate(date:string) { if (!date) return '—'; return new Intl.DateTimeFormat('ru-RU',{day:'numeric',month:'short'}).format(new Date(`${date}T12:00:00`)).replace(' г.','') }

function CreatorDrawer({creator,onClose,onEdit,onDelete,onStatus}:{creator:Creator;onClose:()=>void;onEdit:(r:Creator)=>void;onDelete:(r:Creator)=>void;onStatus:(r:Creator,s:string)=>void}) {
  return <div className="drawer-layer" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}><aside className="creator-drawer"><div className="drawer-top"><span>КАРТОЧКА БЛОГЕРА <span className="drawer-code">/ {creator.code}</span></span><button className="subtle-icon" onClick={onClose} aria-label="Закрыть"><X size={18}/></button></div><div className="drawer-identity"><CreatorCell row={creator}/><Status status={creator.status}/></div><div className="drawer-buttons"><button className="button button-primary" onClick={() => onEdit(creator)}>Редактировать</button><button className="button button-secondary" onClick={() => { const a=document.createElement('a'); a.href=creator.adLink; a.target='_blank'; a.rel='noreferrer'; a.click() }}><ArrowUpRight size={15}/> Ссылка на рекламу</button></div><div className="drawer-section"><div className="drawer-section-heading"><h3>Размещение</h3><span>{formatDate(creator.adDate)}</span></div><div className="detail-grid"><Detail label="Площадка"><Platform name={creator.platform}/></Detail><Detail label="Формат рекламы">{creator.adFormat || '—'}</Detail><Detail label="Категория бюджета">{creator.budgetCategory || '—'}</Detail><Detail label="Статус"><select className="inline-status" value={creator.status} onChange={e => onStatus(creator,e.target.value)}>{statuses.map(s => <option key={s}>{s}</option>)}</select></Detail><Detail label="Стоимость размещения">{money(creator.placementCost)}</Detail><Detail label="Себестоимость товара">{money(creator.productCost)}</Detail></div></div><div className="drawer-section"><div className="drawer-section-heading"><h3>Аудитория и охваты</h3></div><div className="detail-grid"><Detail label="Подписчики">{rub.format(creator.followers)}</Detail><Detail label="Возраст аудитории">{creator.audienceAge}</Detail><Detail label="География аудитории">{creator.audienceGeo}</Detail><Detail label="Охват сторис">{rub.format(creator.storyReach)}</Detail><Detail label="Просмотры рилс">{rub.format(creator.reelViews)}</Detail><Detail label="CPM">{Math.round(creator.cpm).toLocaleString('ru-RU')} ₽</Detail></div></div><div className="drawer-section"><div className="drawer-section-heading"><h3>Комментарий</h3></div><div className="comment-box">{creator.comment || 'Комментария нет'}</div></div><div className="drawer-bottom"><span>Демонстрационная запись</span><button className="delete-button" onClick={() => onDelete(creator)}>Удалить запись</button></div></aside></div>
}
function Detail({label,children}:{label:string;children:React.ReactNode}) { return <div className="detail-item"><small>{label}</small><strong>{children}</strong></div> }

function CreatorForm({creator,rows,onClose,onSubmit}:{creator:Creator|null;rows:Creator[];onClose:()=>void;onSubmit:(r:Creator)=>void}) {
  const [error,setError] = useState('')
  const [data,setData] = useState<Creator>(creator ?? {number:0,code:`DEMO-${String(Math.max(101,...rows.map(r=>Number(r.code.replace(/\D/g,''))))+1)}`,name:'',platform:'Telegram',budgetCategory:'Платное размещение',followers:0,audienceAge:'25–34',audienceGeo:'РФ 65%',storyReach:0,reelViews:0,placementCost:0,productCost:0,adFormat:'Пост',status:'Согласование',adDate:currentLocalDate,adLink:'',comment:'',cpm:0})
  const update = (key:keyof Creator,value:string|number) => setData(previous => {const next={...previous,[key]:value}; if(key==='placementCost'||key==='storyReach')next.cpm=next.storyReach?next.placementCost/next.storyReach*1000:0; return next})
  const field=(label:string,key:keyof Creator,type='text',required=false)=><label className="form-field"><span>{label}{required&&<i> *</i>}</span><input type={type} required={required} min={type==='number'?0:undefined} value={String(data[key] ?? '')} onChange={e=>update(key,type==='number'?Number(e.target.value):e.target.value)}/></label>
  const select=(label:string,key:keyof Creator,options:string[])=><label className="form-field"><span>{label}</span><select value={String(data[key])} onChange={e=>update(key,e.target.value)}>{options.map(v=><option key={v}>{v}</option>)}</select></label>
  return <div className="modal-layer" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><form className="creator-form" onSubmit={e=>{e.preventDefault(); if(!data.name.trim()){setError('Введите имя блогера');return} if(rows.some(r=>r.code===data.code&&r.code!==creator?.code)){setError('Такой артикул уже есть');return} onSubmit({...data,name:data.name.trim(),cpm:data.storyReach?data.placementCost/data.storyReach*1000:0})}}><div className="form-heading"><div><div className="eyebrow">{creator?'ИЗМЕНИТЬ ДАННЫЕ':'НОВАЯ ЗАПИСЬ'}</div><h2>{creator?'Редактировать блогера':'Добавить блогера'}</h2></div><button type="button" className="subtle-icon" onClick={onClose} aria-label="Закрыть"><X size={18}/></button></div><div className="form-grid">{field('Имя блогера','name','text',true)}{field('Артикул','code','text',true)}{select('Площадка','platform',platforms)}{select('Категория бюджета','budgetCategory',['Платное размещение','Бартер'])}{select('Статус','status',statuses)}{select('Формат рекламы','adFormat',['Пост','Короткое видео','Обзор'])}{field('Подписчики','followers','number')}{field('Охват сторис','storyReach','number')}{field('Просмотры рилс','reelViews','number')}{field('Стоимость размещения, ₽','placementCost','number')}{field('Себестоимость товара, ₽','productCost','number')}{field('Дата рекламы','adDate','date')}{select('Возраст аудитории','audienceAge',['18–24','25–34','35–44'])}{field('География аудитории','audienceGeo')}{field('Ссылка на рекламу','adLink')}{field('Комментарий','comment')}</div>{error&&<p className="form-error">{error}</p>}<div className="form-actions"><button type="button" className="button button-secondary" onClick={onClose}>Отмена</button><button type="submit" className="button button-primary">{creator?'Сохранить':'Добавить блогера'}</button></div><p className="form-hint">CPM рассчитывается автоматически на основе стоимости и охвата сторис.</p></form></div>
}

export default App
