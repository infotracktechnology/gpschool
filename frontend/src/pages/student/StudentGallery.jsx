import React, { useState, useMemo } from 'react';
import {
  Image as ImageIcon,
  Calendar,
  Clock,
  Camera,
  Search,
  ChevronRight,
  Maximize2,
  X,
  Sparkles,
  Layers,
} from 'lucide-react';
import { useStudent } from '../../context/StudentContext';
import { api } from '../../api/client';
import { BrowseByDateStrip } from '../../components/student/BrowseByDateStrip';

export const StudentGallery = () => {
  const { albums = [], student } = useStudent();
  const [selectedDate, setSelectedDate] = useState(() => {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
});
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [activeAlbum, setActiveAlbum] = useState(null);
  const [albumMedia, setAlbumMedia] = useState([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState(null);

  // 1. Metric Calculations
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const thisMonthCount = useMemo(() => {
    return albums.filter((a) => {
      const d = a.event_date ? new Date(a.event_date) : null;
      return d && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;
  }, [albums, currentMonth, currentYear]);

  const totalPhotosCount = useMemo(() => {
    return albums.reduce((acc, curr) => acc + (Number(curr.media_count) || 0), 0);
  }, [albums]);

  // 2. Extract categories
  const categoryList = useMemo(() => {
    const list = [];
    const countsMap = {};
    albums.forEach((a) => {
      const cat = a.category || 'School Events';
      countsMap[cat] = (countsMap[cat] || 0) + 1;
    });

    Object.keys(countsMap).forEach((name) => {
      list.push({ name, count: countsMap[name] });
    });

    return list;
  }, [albums]);

  // 3. Filtered albums
  const filteredAlbums = useMemo(() => {
    return albums.filter((item) => {
      // Date filter
      if (selectedDate !== 'all') {
        const itemDate = item.event_date ? String(item.event_date).slice(0, 10) : '';
        if (itemDate !== selectedDate) {
          return false;
        }
      }

      // Category filter
      if (selectedCategory !== 'all') {
        if ((item.category || 'School Events') !== selectedCategory) return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = (item.title || item.album_name)?.toLowerCase().includes(query);
        const matchDesc = item.description?.toLowerCase().includes(query);
        if (!matchTitle && !matchDesc) return false;
      }

      return true;
    });
  }, [albums, selectedDate, selectedCategory, searchQuery]);

  const albumDates = useMemo(() => {
    return albums.map((a) => a.event_date || a.created_at).filter(Boolean);
  }, [albums]);

  const handleOpenAlbum = async (album) => {
    setActiveAlbum(album);
    try {
      setLoadingMedia(true);
      const res = await api.get(`/communication/gallery/${album.id}`);
      if (res && res.success) {
        setAlbumMedia(res.media || res.album?.media || []);
      }
    } catch (err) {
      console.error('Failed to load album media:', err);
      setAlbumMedia([]);
    } finally {
      setLoadingMedia(false);
    }
  };

  const handleCloseAlbum = () => {
    setActiveAlbum(null);
    setAlbumMedia([]);
    setPreviewPhoto(null);
  };

  return (
    <div className="space-y-5 font-sans">
      {/* 1. TOP STATS CARDS */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Albums */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500">Total Albums</div>
            <div className="mt-1 text-3xl font-black text-slate-900">{albums.length}</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-[#008db9] flex items-center justify-center">
            <Camera className="w-6 h-6" />
          </div>
        </div>

        {/* This Month */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-amber-600">This Month</div>
            <div className="mt-1 text-3xl font-black text-amber-600">{thisMonthCount}</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Total Captured Photos */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-rose-600">Total Captured Photos</div>
            <div className="mt-1 text-3xl font-black text-rose-600">{totalPhotosCount}</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>
      </section>

      {/* 2. BROWSE BY DATE STRIP */}
      <BrowseByDateStrip
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        itemDates={albumDates}
        totalCount={albums.length}
      />

      {/* 3. SEARCH ROW */}
      <section className="bg-white rounded-3xl border border-slate-200/90 p-3 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="px-4 py-2 rounded-2xl text-xs font-extrabold bg-slate-100 text-slate-900 border border-slate-300"
          >
            All Photo Albums ({albums.length})
          </button>
        </div>

        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search photo albums..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-2xl border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#008db9]/30 focus:border-[#008db9] transition"
          />
        </div>
      </section>

      {/* 4. FILTER BY EVENT CATEGORY */}
      {categoryList.length > 0 && (
        <section className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">Filter By Event:</span>
            <span className="text-xs text-slate-500">
              {categoryList.length} Categories
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-extrabold transition flex items-center gap-1.5 ${
                selectedCategory === 'all'
                  ? 'bg-[#008db9] text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>All Events</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  selectedCategory === 'all'
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {albums.length}
              </span>
            </button>

            {categoryList.map((cat) => {
              const isSelected = selectedCategory === cat.name;
              return (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#008db9] text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>{cat.name}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {cat.count}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* 5. CONTENT RESULTS OR EMPTY STATE */}
      {filteredAlbums.length === 0 ? (
        <section className="bg-white rounded-3xl border border-slate-200/90 p-16 text-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <ImageIcon className="w-7 h-7 stroke-[1.5]" />
          </div>
          <h3 className="text-base font-extrabold text-slate-800">No Photo Albums Found</h3>
          <p className="mt-1 text-xs text-slate-400">
            {selectedDate !== 'all'
              ? `No event albums found on ${new Date(selectedDate).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}.`
              : 'No photo albums matching your current filters.'}
          </p>
        </section>
      ) : (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAlbums.map((album) => {
            return (
              <div
                key={album.id}
                onClick={() => handleOpenAlbum(album)}
                className="group cursor-pointer rounded-3xl border border-slate-200/90 bg-white overflow-hidden shadow-xs hover:border-[#008db9] hover:shadow-lg transition-all duration-200 flex flex-col"
              >
                <div className="relative h-48 w-full bg-slate-100 overflow-hidden">
                  {album.cover_image || album.cover_image_url ? (
                    <img
                      src={album.cover_image || album.cover_image_url}
                      alt={album.title || album.album_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-gradient-to-br from-sky-50 to-slate-100">
                      <ImageIcon className="w-12 h-12 text-[#008db9]/50 mb-1" />
                      <span className="text-xs font-bold text-[#008db9]">Green Park Memories</span>
                    </div>
                  )}
                  <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[11px] font-black bg-slate-900/70 text-white backdrop-blur-xs">
                    {album.media_count || 0} Photos
                  </span>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-black text-slate-900 group-hover:text-[#008db9] transition">
                      {album.title || album.album_name}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                      {album.description || 'Campus event album.'}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-400">
                      {album.event_date ? new Date(album.event_date).toLocaleDateString('en-IN') : 'Recent'}
                    </span>
                    <span className="font-bold text-[#008db9] inline-flex items-center gap-1">
                      View Photos <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* Album Photos Lightbox Modal */}
      {activeAlbum && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  {activeAlbum.title || activeAlbum.album_name}
                </h3>
                <p className="text-xs text-slate-500">{activeAlbum.description || 'Album Photos'}</p>
              </div>
              <button
                type="button"
                onClick={handleCloseAlbum}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {loadingMedia ? (
                <div className="py-12 text-center text-xs text-slate-500 font-bold">
                  Loading album photos...
                </div>
              ) : albumMedia.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No images uploaded to this album yet.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {albumMedia.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => setPreviewPhoto(m.file_url || m.url)}
                      className="group cursor-pointer relative h-36 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200"
                    >
                      <img
                        src={m.file_url || m.url}
                        alt={m.caption || 'Album Photo'}
                        className="w-full h-full object-cover group-hover:scale-105 transition"
                      />
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                        <Maximize2 className="w-5 h-5" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Photo Preview */}
      {previewPhoto && (
        <div
          onClick={() => setPreviewPhoto(null)}
          className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4 cursor-pointer"
        >
          <img
            src={previewPhoto}
            alt="Preview"
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-2xl"
          />
        </div>
      )}
    </div>
  );
};

export default StudentGallery;
