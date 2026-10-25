import { ref } from 'vue';

const saved = (() => {
  try { return localStorage.getItem('radiomy-language'); } catch { return null; }
})();

export const locale = ref(saved === 'en' ? 'en' : 'ms');

export function setLocale(value) {
  locale.value = value === 'en' ? 'en' : 'ms';
  document.documentElement.lang = locale.value;
  try { localStorage.setItem('radiomy-language', locale.value); } catch { /* Storage may be unavailable. */ }
}

setLocale(locale.value);

const messages = {
  ms: {
    home: 'Utama', radio: 'Radio Langsung', tv: 'TV Langsung', epg: 'Panduan EPG',
    menu: 'Buka menu', closeMenu: 'Tutup menu', language: 'Bahasa',
    discover: 'Terokai kandungan Malaysia', discoverIntro: 'Drama, filem, sukan dan rancangan pilihan daripada RTMKlik dan Tonton.',
    catalogue: 'Katalog kandungan', browse: 'Terokai katalog', provider: 'Penyedia', allProviders: 'Semua penyedia',
    allSections: 'Semua kategori', viewAll: 'Lihat semua', backToCatalogue: 'Kembali ke katalog',
    openProvider: 'Buka di laman penyedia', externalLink: 'Dibuka di laman penyedia',
    loadingCatalogue: 'Memuatkan katalog...', catalogueError: 'Katalog tidak dapat dimuatkan.',
    emptyCatalogue: 'Tiada kandungan untuk kategori ini.', retry: 'Cuba lagi',
    liveNow: 'Siaran langsung', listenRadio: 'Dengar radio', watchTV: 'Tonton TV',
    radioIntro: 'Dengar siaran stesen radio kegemaran anda secara percuma.',
    tvIntro: 'Pilih saluran televisyen untuk memulakan siaran langsung.',
    searchRadio: 'Cari stesen radio...', searchTV: 'Cari saluran TV...',
    noRadio: 'Tiada stesen radio dijumpai mengikut tapisan anda.',
    noTV: 'Tiada saluran TV dijumpai mengikut tapisan anda.',
    loadRadioError: 'Senarai stesen radio tidak dapat dimuatkan.',
    loadTVError: 'Senarai saluran TV tidak dapat dimuatkan.',
    back: 'Kembali', recentSongs: 'Lagu terakhir dimainkan', recentSongsIntro: 'Sejarah lagu terdahulu stesen ini',
    refreshMetadata: 'Kemas kini metadata', unnamedSong: 'Lagu tanpa tajuk',
    noHistory: 'Sejarah lagu tidak disokong untuk stesen ini.',
    noAudio: 'Strim audio belum disediakan.', noVideo: 'Strim video belum disediakan.', loadingPlayer: 'Memuatkan pemain...',
    unsupportedEmbed: 'Pemain untuk saluran ini belum tersedia.',
    unsupportedEmbedDetail: 'Penyedia memulangkan data strim dan bukannya pemain web.',
    tvSchedule: 'Jadual EPG TV', refreshSchedule: 'Kemas kini EPG hari ini',
    noSchedule: 'Tiada jadual EPG ditemui untuk saluran ini pada',
    otherRadio: 'Stesen radio lain', otherTV: 'Saluran TV lain',
    searchEPG: 'Cari rancangan atau saluran TV...', allChannels: 'Semua saluran',
    loadingEPG: 'Memuatkan data EPG...', epgError: 'Panduan EPG tidak dapat dimuatkan.',
    noEPG: 'Tiada saluran ditemui mengikut tapisan anda.',
    selectProgramme: 'Pilih rancangan untuk melihat butiran.',
    noDescription: 'Tiada maklumat lanjut untuk rancangan ini.',
    airing: 'Sedang bersiaran', watchChannel: 'Tonton saluran ini',
    currentNext: 'Sedang & seterusnya', fullSchedule: 'Lihat jadual penuh', collapseSchedule: 'Ringkaskan jadual',
    noProgrammes: 'Tiada senarai rancangan untuk saluran ini.', noDetails: 'Tiada butiran', untitledProgramme: 'Rancangan tanpa tajuk',
    minutesLeft: 'min lagi', channelId: 'ID',
  },
  en: {
    home: 'Home', radio: 'Live Radio', tv: 'Live TV', epg: 'TV Guide',
    menu: 'Open menu', closeMenu: 'Close menu', language: 'Language',
    discover: 'Discover Malaysian content', discoverIntro: 'Drama, movies, sports and featured shows from RTMKlik and Tonton.',
    catalogue: 'Content catalogue', browse: 'Browse catalogue', provider: 'Provider', allProviders: 'All providers',
    allSections: 'All categories', viewAll: 'View all', backToCatalogue: 'Back to catalogue',
    openProvider: 'Open on provider site', externalLink: 'Opens on provider site',
    loadingCatalogue: 'Loading catalogue...', catalogueError: 'Could not load the catalogue.',
    emptyCatalogue: 'No content is available in this category.', retry: 'Try again',
    liveNow: 'Live broadcasts', listenRadio: 'Listen to radio', watchTV: 'Watch TV',
    radioIntro: 'Listen to your favourite radio stations for free.',
    tvIntro: 'Choose a TV channel to start watching live.',
    searchRadio: 'Search radio stations...', searchTV: 'Search TV channels...',
    noRadio: 'No radio stations match your filters.',
    noTV: 'No TV channels match your filters.',
    loadRadioError: 'Could not load radio stations.',
    loadTVError: 'Could not load TV channels.',
    back: 'Back', recentSongs: 'Recently played', recentSongsIntro: 'Previous songs on this station',
    refreshMetadata: 'Refresh metadata', unnamedSong: 'Untitled song',
    noHistory: 'Song history is unavailable for this station.',
    noAudio: 'This audio stream is unavailable.', noVideo: 'This video stream is unavailable.', loadingPlayer: 'Loading player...',
    unsupportedEmbed: 'A player is unavailable for this channel.',
    unsupportedEmbedDetail: 'The provider returned stream data instead of a web player.',
    tvSchedule: 'TV schedule', refreshSchedule: 'Refresh today’s schedule',
    noSchedule: 'No schedule was found for this channel on',
    otherRadio: 'Other radio stations', otherTV: 'Other TV channels',
    searchEPG: 'Search shows or TV channels...', allChannels: 'All channels',
    loadingEPG: 'Loading TV guide...', epgError: 'Could not load the TV guide.',
    noEPG: 'No channels match your filters.',
    selectProgramme: 'Select a programme to see its details.',
    noDescription: 'No further details are available for this programme.',
    airing: 'On air', watchChannel: 'Watch this channel',
    currentNext: 'Now & next', fullSchedule: 'View full schedule', collapseSchedule: 'Show less',
    noProgrammes: 'No schedule is available for this channel.', noDetails: 'No details', untitledProgramme: 'Untitled programme',
    minutesLeft: 'min left', channelId: 'ID',
  },
};

const sectionNames = {
  'fifa-match-replay': ['Ulangan Perlawanan FIFA', 'FIFA Match Replay'],
  'sports-highlights': ['Sorotan Sukan', 'Sports Highlights'],
  trending: ['Popular', 'Trending'], exclusives: ['Eksklusif', 'Exclusives'],
  upcoming: ['Akan Datang', 'Upcoming'], 'brand-new': ['Terbaharu', 'Brand New'],
  drama: ['Drama', 'Drama'], 'movie-telemovie': ['Filem & Telemovie', 'Movies & Telemovies'],
  entertainment: ['Hiburan', 'Entertainment'],
  'most-watched-shows': ['Rancangan Paling Ditonton', 'Most Watched Shows'],
  'most-watched-movies': ['Filem Paling Ditonton', 'Most Watched Movies'],
};

export function useI18n() {
  const t = key => messages[locale.value][key] || key;
  const sectionTitle = (id, fallback) => sectionNames[id]?.[locale.value === 'ms' ? 0 : 1] || fallback || id;
  return { locale, setLocale, t, sectionTitle };
}
