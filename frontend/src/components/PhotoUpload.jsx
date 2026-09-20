import React, { useState, useRef } from 'react';
import { Camera, Upload, Trash2, Loader2, User } from 'lucide-react';
import api from '../utils/api';
import { useLanguage } from '../context/LanguageContext';

export default function PhotoUpload({
  photoUrl,
  onChange,
  uploadEndpoint = '/upload/student',
  label = null,
  shape = 'circle' // 'circle' or 'rounded'
}) {
  const { t } = useLanguage();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const displayLabel = label !== null ? label : t('photo_upload.label');

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so re-selecting same file triggers change
    e.target.value = '';

    // Quick client-side size check (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setError(t('photo_upload.size_limit_error'));
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError(t('photo_upload.format_error'));
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('photo', file);

      const res = await api.upload(uploadEndpoint, formData);
      if (res && res.success && res.photo_url) {
        onChange(res.photo_url);
      } else {
        throw new Error(res?.message || t('photo_upload.upload_failed'));
      }
    } catch (err) {
      console.error('[PHOTO UPLOAD ERROR]', err);
      setError(err.message || t('photo_upload.upload_error'));
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    onChange('');
    setError(null);
  };

  return (
    <div className="space-y-1.5">
      {displayLabel && (
        <label className="block text-xs font-bold text-slate-700">
          {displayLabel}
        </label>
      )}

      <div className="flex items-center gap-4 p-3 bg-slate-50/80 border border-slate-200/80 rounded-2xl">
        {/* Photo Preview / Click to upload */}
        <div
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={`relative group cursor-pointer flex-shrink-0 bg-white border-2 border-dashed border-slate-300 hover:border-emerald-500 transition-all duration-200 overflow-hidden flex items-center justify-center ${
            shape === 'circle' ? 'w-20 h-20 rounded-full' : 'w-20 h-20 rounded-2xl'
          } ${uploading ? 'pointer-events-none opacity-75' : ''}`}
          title={t('photo_upload.click_to_upload')}
        >
          {uploading ? (
            <div className="flex flex-col items-center justify-center p-2 text-emerald-600">
              <Loader2 className="w-6 h-6 animate-spin mb-1" />
              <span className="text-[9px] font-bold">{t('photo_upload.uploading')}</span>
            </div>
          ) : photoUrl ? (
            <>
              <img
                src={photoUrl}
                alt={t('photo_upload.label')}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  setError(t('photo_upload.image_load_failed'));
                }}
              />
              <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                <Camera className="w-5 h-5" />
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-400 group-hover:text-emerald-600 transition-colors p-2 text-center">
              <User className="w-6 h-6 mb-1" />
              <span className="text-[9px] font-semibold">{t('photo_upload.upload_photo')}</span>
            </div>
          )}
        </div>

        {/* Action buttons & info */}
        <div className="flex-1 min-w-0">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/jpg,image/gif"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="flex items-center gap-2 flex-wrap mb-1">
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-2xs"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-600" />
              <span>{photoUrl ? t('photo_upload.change_photo') : t('photo_upload.upload_photo')}</span>
            </button>

            {photoUrl && (
              <button
                type="button"
                disabled={uploading}
                onClick={handleRemove}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/60 rounded-xl text-xs font-bold transition-all"
                title={t('photo_upload.remove_tooltip')}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t('photo_upload.remove_photo')}</span>
              </button>
            )}
          </div>

          <p className="text-[10px] text-slate-400">
            {t('photo_upload.specs_note')}
          </p>

          {error && (
            <p className="text-[11px] font-bold text-rose-600 mt-1">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
