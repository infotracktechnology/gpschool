import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
    BookOpen, Plus, Search, Calendar, Clock, Paperclip, Trash2, Edit2, 
    ArrowLeft, X, Send, Loader2, FileText, Image as ImageIcon,
    UploadCloud, CheckCircle2, Link as LinkIcon, Video, ExternalLink
} from 'lucide-react';
import { communicationService } from '../../services/communicationService';
import { getClassSubjects } from '../../services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

export const HomeworkView = ({ branchId, academicYearId, classes, sections, showToast, formAction, editItemId }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const [homeworkList, setHomeworkList] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filters
    const [selectedClassId, setSelectedClassId] = useState('all');
    const [selectedSectionId, setSelectedSectionId] = useState('all');
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Create/Edit Form State
    const [editingHomework, setEditingHomework] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formClassId, setFormClassId] = useState(0);
    const [formSectionId, setFormSectionId] = useState('all');

    // Dynamic Class Subjects
    const [classSubjectsList, setClassSubjectsList] = useState([]);
    const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
    const [formSubjectId, setFormSubjectId] = useState('');
    const [formSubject, setFormSubject] = useState('');

    const [formTitle, setFormTitle] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formAssignedDate, setFormAssignedDate] = useState(new Date().toISOString().split('T')[0]);
  
    // Schedule Checkbox & start_at
    const [isScheduled, setIsScheduled] = useState(false);
    const [formStartAt, setFormStartAt] = useState('');

    // Attachments Toggle & 4 Inputs (Doc, Image, Link, Video)
    const [hasAttachments, setHasAttachments] = useState(false);
    const [docFileObj, setDocFileObj] = useState(null);
    const [imageFileObj, setImageFileObj] = useState(null);
    const [linkUrl, setLinkUrl] = useState('');
    const [videoUrl, setVideoUrl] = useState('');
    const [uploadingDoc, setUploadingDoc] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);

    const docInputRef = useRef(null);
    const imageInputRef = useRef(null);

    const availableSectionsForClass = sections.filter((s) => s.class_id === (editingHomework ? editingHomework.class_id : formClassId));

    const filterAvailableSections = useMemo(() => {
        if (selectedClassId === 'all') {
            const unique = new Map();
            (sections || []).forEach(s => {
                if (s && s.name && !unique.has(s.name)) {
                    unique.set(s.name, { id: s.name, name: s.name });
                }
            });
            return Array.from(unique.values()).sort((a, b) => a.name.localeCompare(b.name));
        }
        return (sections || []).filter(s => s.class_id === Number(selectedClassId));
    }, [selectedClassId, sections]);

    // ========================================
    // DATA FETCHING
    // ========================================

    const fetchHomework = useCallback(async () => {
        setIsLoading(true);
        try {
            const isNumericSec = selectedSectionId !== 'all' && !isNaN(Number(selectedSectionId));
            const data = await communicationService.getHomework({
                branch_id: branchId,
                academic_year_id: academicYearId,
                class_id: selectedClassId !== 'all' ? Number(selectedClassId) : undefined,
                section_id: selectedSectionId !== 'all' ? (isNumericSec ? Number(selectedSectionId) : selectedSectionId) : undefined,
                status: selectedStatus !== 'all' ? selectedStatus : undefined,
                search: searchQuery.trim() || undefined
            });
            setHomeworkList(data);
        } catch (err) {
            showToast(err.message || 'Failed to load homework records', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [branchId, academicYearId, selectedClassId, selectedSectionId, selectedStatus, searchQuery, showToast]);

    useEffect(() => {
        fetchHomework();
    }, [fetchHomework]);

    // Fetch subjects dynamically whenever formClassId changes
    const fetchSubjectsForClass = useCallback(async (targetClassId) => {
        if (!targetClassId) {
            setClassSubjectsList([]);
            return;
        }
        setIsLoadingSubjects(true);
        try {
            const subs = await getClassSubjects(branchId, academicYearId, targetClassId);
            setClassSubjectsList(subs || []);
            if (subs && subs.length > 0) {
                setFormSubjectId(prev => {
                    const found = subs.find(s => String(s.subject_id) === String(prev));
                    if (found) {
                        setFormSubject(found.subject_name);
                        return prev;
                    }
                    setFormSubject(subs[0].subject_name);
                    return subs[0].subject_id;
                });
            } else {
                setFormSubjectId('');
                setFormSubject('');
            }
        } catch (err) {
            console.error('Failed to load class subjects:', err);
            setClassSubjectsList([]);
        } finally {
            setIsLoadingSubjects(false);
        }
    }, [branchId, academicYearId]);

    // Load subjects when in form mode and formClassId changes
    useEffect(() => {
        if (formAction && formClassId) {
            fetchSubjectsForClass(formClassId);
        }
    }, [formAction, formClassId, fetchSubjectsForClass]);

    // ========================================
    // FORM INITIALIZATION (New / Edit)
    // ========================================

    const populateFormFromHomework = useCallback((hw) => {
        setEditingHomework(hw);
        setFormClassId(hw.class_id);
        setFormSectionId(hw.section_id ? String(hw.section_id) : 'all');
        setFormSubjectId(hw.subject_id ? String(hw.subject_id) : '');
        setFormSubject(hw.subject_name || '');
        setFormTitle(hw.title || '');
        setFormDescription(hw.description || hw.instructions || '');
        setFormAssignedDate(hw.assigned_date ? hw.assigned_date.split('T')[0] : new Date().toISOString().split('T')[0]);

        const scheduled = Boolean(hw.is_scheduled || hw.status === 'Scheduled');
        setIsScheduled(scheduled);
        setFormStartAt(hw.start_at ? hw.start_at.slice(0, 16) : '');

        let atts = hw.attachments;
        if (typeof atts === 'string') {
            try { atts = JSON.parse(atts); } catch (e) { atts = null; }
        }
        if (atts && (atts.doc || atts.image || atts.link || atts.video)) {
            setHasAttachments(true);
            setDocFileObj(atts.doc || null);
            setImageFileObj(atts.image || null);
            setLinkUrl(atts.link || '');
            setVideoUrl(atts.video || '');
        } else if (hw.attachment_url) {
            setHasAttachments(true);
            const isImg = hw.attachment_url.match(/\.(jpeg|jpg|png|gif|webp)$/i);
            if (isImg) {
                setImageFileObj({ name: hw.attachment_name || 'Attached Image', url: hw.attachment_url });
                setDocFileObj(null);
            } else {
                setDocFileObj({ name: hw.attachment_name || 'Attached Document', url: hw.attachment_url });
                setImageFileObj(null);
            }
            setLinkUrl('');
            setVideoUrl('');
        } else {
            setHasAttachments(false);
            setDocFileObj(null);
            setImageFileObj(null);
            setLinkUrl('');
            setVideoUrl('');
        }
    }, []);

    useEffect(() => {
        if (formAction === 'new') {
            setEditingHomework(null);
            const defaultClassId = classes[0]?.id || 0;
            setFormClassId(defaultClassId);
            setFormSectionId('all');
            setFormSubjectId('');
            setFormSubject('');
            setFormTitle('');
            setFormDescription('');
            setFormAssignedDate(new Date().toISOString().split('T')[0]);
            setIsScheduled(false);
            setFormStartAt('');
            setHasAttachments(false);
            setDocFileObj(null);
            setImageFileObj(null);
            setLinkUrl('');
            setVideoUrl('');
        } else if (formAction === 'edit' && editItemId) {
            const hw = location.state?.homework;
            if (hw) {
                populateFormFromHomework(hw);
            } else {
                // Fallback: fetch list and find by ID
                (async () => {
                    try {
                        const data = await communicationService.getHomework({
                            branch_id: branchId,
                            academic_year_id: academicYearId
                        });
                        const found = data.find(h => String(h.id) === String(editItemId));
                        if (found) {
                            populateFormFromHomework(found);
                        } else {
                            showToast('Homework record not found', 'error');
                            navigate('/communication/homework');
                        }
                    } catch (err) {
                        showToast('Failed to load homework for editing', 'error');
                        navigate('/communication/homework');
                    }
                })();
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formAction, editItemId]);

    // ========================================
    // FILE UPLOAD
    // ========================================

    const handleFileUpload = async (file, type) => {
        if (!file) return;
        const reader = new FileReader();
        const setUploading = type === 'doc' ? setUploadingDoc : setUploadingImage;
        const setFileObj = type === 'doc' ? setDocFileObj : setImageFileObj;

        setUploading(true);
        reader.onload = async () => {
            try {
                const base64Data = reader.result;
                const res = await communicationService.uploadAttachment(file.name, base64Data);
                if (res.success && res.url) {
                    setFileObj({
                        name: file.name,
                        url: res.url,
                        size: (file.size / 1024).toFixed(1) + ' KB'
                    });
                    showToast(`${type === 'doc' ? 'Document' : 'Image'} uploaded successfully`, 'success');
                } else {
                    showToast('Failed to upload file', 'error');
                }
            } catch (err) {
                console.error(err);
                showToast(err.message || 'Error uploading file', 'error');
            } finally {
                setUploading(false);
            }
        };
        reader.onerror = () => {
            setUploading(false);
            showToast('Unable to read file', 'error');
        };
        reader.readAsDataURL(file);
    };

    // ========================================
    // SAVE & DELETE
    // ========================================

    const handleSaveHomework = async (e) => {
        e.preventDefault();
        if (!formTitle.trim()) {
            showToast('Please enter a homework title', 'error');
            return;
        }
        if (!formClassId) {
            showToast('Please select a target class', 'error');
            return;
        }
        if (!formSubject) {
            showToast('Please select a subject from the list', 'error');
            return;
        }
        if (isScheduled && !formStartAt) {
            showToast('Please select a schedule start date and time', 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            const finalStatus = isScheduled ? 'Scheduled' : 'Published';

            let attachmentsPayload = null;
            if (hasAttachments) {
                const trimmedLink = linkUrl.trim();
                const trimmedVideo = videoUrl.trim();
                if (docFileObj || imageFileObj || trimmedLink || trimmedVideo) {
                    attachmentsPayload = {
                        doc: docFileObj || null,
                        image: imageFileObj || null,
                        link: trimmedLink || null,
                        video: trimmedVideo || null
                    };
                }
            }

            const payload = {
                organization_id: 1,
                branch_id: branchId,
                academic_year_id: academicYearId,
                class_id: formClassId,
                section_id: formSectionId !== 'all' ? Number(formSectionId) : null,
                subject_id: formSubjectId ? Number(formSubjectId) : 1,
                subject_name: formSubject,
                teacher_name: editingHomework?.teacher_name || 'Staff In-Charge',
                title: formTitle.trim(),
                description: formDescription.trim(),
                instructions: '',
                assigned_date: formAssignedDate,
                is_scheduled: isScheduled ? 1 : 0,
                start_at: isScheduled && formStartAt ? formStartAt : null,
                status: finalStatus,
                attachments: attachmentsPayload
            };

            if (editingHomework) {
                await communicationService.updateHomework(editingHomework.id, payload);
                showToast('Homework updated successfully', 'success');
            } else {
                await communicationService.createHomework(payload);
                showToast('Homework posted successfully to students and parents', 'success');
            }
            navigate('/communication/homework');
        } catch (err) {
            showToast(err.message || 'Failed to save homework', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this homework posting?'))
            return;
        try {
            await communicationService.deleteHomework(id);
            showToast('Homework deleted successfully', 'success');
            fetchHomework();
        } catch (err) {
            showToast(err.message || 'Failed to delete homework', 'error');
        }
    };

    // ========================================
    // RENDER: FULL-PAGE FORM VIEW
    // ========================================

    if (formAction) {
        return (
            <div className="space-y-5">
                {/* Header with Back */}
                <Card className="p-4 sm:p-5 shadow-xs">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <button
                                type="button"
                                onClick={() => navigate('/communication/homework')}
                                className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800 transition-colors cursor-pointer"
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </button>
                            <div className="flex items-center space-x-2">
                                <span className="p-2 rounded-xl bg-cyan-50 text-cyan-700">
                                    <BookOpen className="w-5 h-5" />
                                </span>
                                <div>
                                    <h2 className="text-base sm:text-lg font-bold text-slate-900">
                                        {editingHomework ? 'Edit Homework Posting' : 'Post New Homework'}
                                    </h2>
                                    <p className="text-xs text-slate-500 font-medium">
                                        Assigned to students and parents of the selected class/section
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Form Card */}
                <Card className="shadow-xs overflow-hidden">
                    <form onSubmit={handleSaveHomework} className="p-5 sm:p-8 space-y-6">
                        {/* Row 1: Class, Section, Subject */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {/* Target Class */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Target Class <span className="text-rose-500">*</span>
                                </label>
                                <select 
                                    value={formClassId} 
                                    onChange={(e) => {
                                        const newClassId = Number(e.target.value);
                                        setFormClassId(newClassId);
                                        setFormSectionId('all');
                                        fetchSubjectsForClass(newClassId);
                                    }} 
                                    required 
                                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-medium focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                                >
                                    {classes.length === 0 && <option value={0}>Loading classes...</option>}
                                    {classes.map((c) => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Target Section */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">Target Section</label>
                                <select 
                                    value={formSectionId} 
                                    onChange={(e) => setFormSectionId(e.target.value)} 
                                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-medium focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                                >
                                    <option value="all">All Sections in Class</option>
                                    {availableSectionsForClass.map((s) => (
                                        <option key={s.id} value={s.id}>Section {s.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Subject */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                                    <span>Subject <span className="text-rose-500">*</span></span>
                                    {isLoadingSubjects && <span className="text-[10px] text-cyan-600 font-normal">Loading...</span>}
                                </label>
                                <select 
                                    value={formSubjectId} 
                                    onChange={(e) => {
                                        const subId = e.target.value;
                                        setFormSubjectId(subId);
                                        const found = classSubjectsList.find(s => String(s.subject_id) === String(subId));
                                        if (found) setFormSubject(found.subject_name);
                                    }} 
                                    required 
                                    disabled={isLoadingSubjects}
                                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-medium focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 disabled:bg-slate-100"
                                >
                                    {classSubjectsList.length === 0 ? (
                                        <option value="">No mapped subjects found</option>
                                    ) : (
                                        classSubjectsList.map((cs) => (
                                            <option key={cs.subject_id || cs.id} value={cs.subject_id}>
                                                {cs.subject_name} {cs.subject_code ? `(${cs.subject_code})` : ''}
                                            </option>
                                        ))
                                    )}
                                </select>
                            </div>
                        </div>

                        {/* Title */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Homework Title <span className="text-rose-500">*</span>
                            </label>
                            <input 
                                type="text" 
                                required 
                                placeholder="e.g. Fractions Chapter 4 Exercise 4.2 practice problems" 
                                value={formTitle} 
                                onChange={(e) => setFormTitle(e.target.value)} 
                                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-medium focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500" 
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                            <textarea 
                                rows={4} 
                                placeholder="Detailed explanation of the problems, textbook page numbers, exercises..." 
                                value={formDescription} 
                                onChange={(e) => setFormDescription(e.target.value)} 
                                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-medium focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 leading-relaxed" 
                            />
                        </div>

                        {/* Row 2: Assigned Date */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Assigned Date <span className="text-rose-500">*</span>
                                </label>
                                <input 
                                    type="date" 
                                    required 
                                    value={formAssignedDate} 
                                    onChange={(e) => setFormAssignedDate(e.target.value)} 
                                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-medium focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500" 
                                />
                            </div>
                        </div>

                        {/* Schedule Checkbox */}
                        <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-3">
                            <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                                <input 
                                    type="checkbox" 
                                    checked={isScheduled} 
                                    onChange={(e) => {
                                        const checked = e.target.checked;
                                        setIsScheduled(checked);
                                        if (checked && !formStartAt) {
                                            const now = new Date();
                                            now.setHours(now.getHours() + 1);
                                            setFormStartAt(now.toISOString().slice(0, 16));
                                        }
                                        if (!checked) setFormStartAt('');
                                    }}
                                    className="w-4 h-4 text-cyan-600 rounded border-slate-300 focus:ring-cyan-500" 
                                />
                                <span className="text-xs font-bold text-slate-800">
                                    Schedule this Homework for Future Publishing
                                </span>
                            </label>

                            {isScheduled && (
                                <div className="pl-6 pt-1">
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Publish Schedule Date & Time <span className="text-rose-500">*</span>
                                    </label>
                                    <input 
                                        type="datetime-local" 
                                        required={isScheduled}
                                        value={formStartAt} 
                                        onChange={(e) => setFormStartAt(e.target.value)} 
                                        className="w-full sm:w-72 px-3 py-2 text-xs rounded-lg border border-slate-300 font-medium bg-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500" 
                                    />
                                    <p className="text-[11px] text-slate-500 mt-1">
                                        Students and parents will only see this homework after this date & time.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Attachments */}
                        <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <Paperclip className="w-4 h-4 text-cyan-700" />
                                    <span className="text-xs font-bold text-slate-800">Add Attachments</span>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={hasAttachments} 
                                        onChange={(e) => {
                                            const checked = e.target.checked;
                                            setHasAttachments(checked);
                                            if (!checked) {
                                                setDocFileObj(null);
                                                setImageFileObj(null);
                                                setLinkUrl('');
                                                setVideoUrl('');
                                            }
                                        }} 
                                        className="sr-only peer" 
                                    />
                                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-600"></div>
                                </label>
                            </div>

                            {hasAttachments && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                    {/* Doc Upload */}
                                    <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700">
                                                <FileText className="w-4 h-4 text-blue-600" />
                                                <span>Doc (Document file)</span>
                                            </div>
                                            <span className="text-[10px] text-slate-400 font-medium">PDF, DOC, DOCX, TXT</span>
                                        </div>
                                        <input type="file" ref={docInputRef} accept=".pdf,.doc,.docx,.txt" onChange={(e) => handleFileUpload(e.target.files[0], 'doc')} className="hidden" />
                                        {docFileObj ? (
                                            <div className="flex items-center justify-between p-2 rounded-lg bg-blue-50/70 border border-blue-200/60 text-xs">
                                                <div className="flex items-center space-x-2 truncate">
                                                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                                                    <span className="font-semibold text-blue-900 truncate max-w-[150px]">{docFileObj.name}</span>
                                                </div>
                                                <button type="button" onClick={() => { setDocFileObj(null); if (docInputRef.current) docInputRef.current.value = ''; }} className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer">
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ) : (
                                            <button type="button" disabled={uploadingDoc} onClick={() => docInputRef.current?.click()} className="w-full py-2 px-3 border border-dashed border-slate-300 rounded-lg text-xs font-semibold text-slate-600 hover:text-cyan-700 hover:border-cyan-400 bg-slate-50/50 hover:bg-cyan-50/40 transition-colors flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50">
                                                {uploadingDoc ? (<><Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-600" /><span>Uploading doc...</span></>) : (<><UploadCloud className="w-3.5 h-3.5 text-slate-400" /><span>Choose Document</span></>)}
                                            </button>
                                        )}
                                    </div>

                                    {/* Image Upload */}
                                    <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700">
                                                <ImageIcon className="w-4 h-4 text-purple-600" />
                                                <span>Image (Image file)</span>
                                            </div>
                                            <span className="text-[10px] text-slate-400 font-medium">PNG, JPG, JPEG, WEBP</span>
                                        </div>
                                        <input type="file" ref={imageInputRef} accept="image/*" onChange={(e) => handleFileUpload(e.target.files[0], 'image')} className="hidden" />
                                        {imageFileObj ? (
                                            <div className="flex items-center justify-between p-2 rounded-lg bg-purple-50/70 border border-purple-200/60 text-xs">
                                                <div className="flex items-center space-x-2 truncate">
                                                    <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                                                    <span className="font-semibold text-purple-900 truncate max-w-[150px]">{imageFileObj.name}</span>
                                                </div>
                                                <button type="button" onClick={() => { setImageFileObj(null); if (imageInputRef.current) imageInputRef.current.value = ''; }} className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer">
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ) : (
                                            <button type="button" disabled={uploadingImage} onClick={() => imageInputRef.current?.click()} className="w-full py-2 px-3 border border-dashed border-slate-300 rounded-lg text-xs font-semibold text-slate-600 hover:text-cyan-700 hover:border-cyan-400 bg-slate-50/50 hover:bg-cyan-50/40 transition-colors flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50">
                                                {uploadingImage ? (<><Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-600" /><span>Uploading image...</span></>) : (<><UploadCloud className="w-3.5 h-3.5 text-slate-400" /><span>Choose Image</span></>)}
                                            </button>
                                        )}
                                    </div>

                                    {/* Link */}
                                    <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                                        <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700">
                                            <LinkIcon className="w-4 h-4 text-emerald-600" />
                                            <span>Link (Web / Resource URL)</span>
                                        </div>
                                        <input type="url" placeholder="https://example.com/study-material" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-medium focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500" />
                                    </div>

                                    {/* Video */}
                                    <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                                        <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700">
                                            <Video className="w-4 h-4 text-rose-600" />
                                            <span>Video (Video URL or embed)</span>
                                        </div>
                                        <input type="url" placeholder="https://youtube.com/watch?v=..." value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-medium focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500" />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer Actions */}
                        <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                            <button 
                                type="button" 
                                onClick={() => navigate('/communication/homework')} 
                                className="px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit" 
                                disabled={isSubmitting || uploadingDoc || uploadingImage} 
                                className="inline-flex items-center space-x-1.5 px-6 py-2.5 text-xs font-semibold rounded-xl bg-cyan-700 text-white hover:bg-cyan-800 transition-colors shadow-xs cursor-pointer disabled:opacity-60"
                            >
                                {isSubmitting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Send className="w-4 h-4" />
                                )}
                                <span>
                                    {editingHomework 
                                        ? 'Update Homework' 
                                        : isScheduled 
                                            ? 'Schedule Homework' 
                                            : 'Publish Homework'}
                                </span>
                            </button>
                        </div>
                    </form>
                </Card>
            </div>
        );
    }

    // ========================================
    // RENDER: CARD GRID LIST VIEW
    // ========================================

    return (
        <div className="space-y-5">
            {/* Top Banner & Action */}
            <Card className="p-4 sm:p-5 shadow-xs">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                        <div className="flex items-center space-x-2">
                            <span className="p-2 rounded-xl bg-cyan-50 text-cyan-700">
                                <BookOpen className="w-5 h-5" />
                            </span>
                            <div>
                                <h2 className="text-base sm:text-lg font-bold text-slate-900">Homework Management</h2>
                                <p className="text-xs text-slate-500 font-medium">
                                    Daily homework posting for each branch, class, and section.
                                </p>
                            </div>
                        </div>
                    </div>
                    <Button 
                        type="button" 
                        onClick={() => navigate('/communication/homework/new')} 
                        className="w-full sm:w-auto shadow-xs active:scale-95 cursor-pointer text-white"
                    >
                        <Plus className="w-4 h-4 mr-1.5" />
                        <span>Post New Homework</span>
                    </Button>
                </div>
            </Card>

            {/* Filter Bar */}
            <Card className="p-4 shadow-xs space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    {/* Search */}
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 z-10" />
                        <Input 
                            type="text" 
                            placeholder="Search homework title or subject..." 
                            value={searchQuery} 
                            onChange={(e) => setSearchQuery(e.target.value)} 
                            className="pl-9 h-9 text-xs" 
                        />
                    </div>

                    {/* Class Filter */}
                    <div>
                        <select 
                            value={selectedClassId} 
                            onChange={(e) => {
                                setSelectedClassId(e.target.value);
                                setSelectedSectionId('all');
                            }} 
                            className="w-full h-9 px-3 text-xs rounded-md border border-input bg-transparent font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                            <option value="all">All Classes</option>
                            {classes.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Section Filter */}
                    <div>
                        <select 
                            value={selectedSectionId} 
                            onChange={(e) => setSelectedSectionId(e.target.value)} 
                            className="w-full h-9 px-3 text-xs rounded-md border border-input bg-transparent font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                            <option value="all">All Sections</option>
                            {filterAvailableSections.map((s) => (
                                <option key={s.id} value={String(s.id)}>Section {s.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Status Filter */}
                    <div>
                        <select 
                            value={selectedStatus} 
                            onChange={(e) => setSelectedStatus(e.target.value)} 
                            className="w-full h-9 px-3 text-xs rounded-md border border-input bg-transparent font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                            <option value="all">All Statuses</option>
                            <option value="Published">Published</option>
                            <option value="Draft">Draft</option>
                            <option value="Scheduled">Scheduled</option>
                        </select>
                    </div>

                    {/* Reset */}
                    <div className="flex items-center">
                        <Button 
                            variant="outline"
                            size="sm"
                            type="button" 
                            onClick={() => {
                                setSelectedClassId('all');
                                setSelectedSectionId('all');
                                setSelectedStatus('all');
                                setSearchQuery('');
                            }} 
                            className="w-full h-9 text-xs"
                        >
                            Clear Filters
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Homework Card Grid */}
            {isLoading ? (
                <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center shadow-xs flex flex-col items-center justify-center space-y-3">
                    <Loader2 className="w-7 h-7 text-cyan-700 animate-spin" />
                    <p className="text-xs font-semibold text-slate-600">Loading branch homework records...</p>
                </div>
            ) : homeworkList.length === 0 ? (
                <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center shadow-xs flex flex-col items-center justify-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-cyan-50 flex items-center justify-center text-cyan-600">
                        <BookOpen className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800">No Homework Found</h3>
                    <p className="text-xs text-slate-500 max-w-sm">
                        There are no homework postings matching your criteria for this branch and academic year.
                    </p>
                    <button
                        type="button"
                        onClick={() => navigate('/communication/homework/new')}
                        className="px-4 py-2 rounded-xl bg-cyan-700 text-white font-semibold text-xs hover:bg-cyan-800 transition-colors shadow-xs cursor-pointer"
                    >
                        Post First Homework
                    </button>
                </div>
            ) : (
                <div>
                    <div className="flex items-center justify-between px-1 pb-3">
                        <h3 className="text-sm font-bold text-slate-800">Homework Records</h3>
                        <span className="text-xs font-semibold text-slate-500">{homeworkList.length} record(s)</span>
                    </div>


                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                        <th className="px-4 py-3 text-xs font-bold text-slate-600">S.No</th>
                                        <th className="px-4 py-3 text-xs font-bold text-slate-600">Subject</th>
                                        <th className="px-4 py-3 text-xs font-bold text-slate-600">Homework Title</th>
                                        <th className="px-4 py-3 text-xs font-bold text-slate-600">Class</th>
                                        <th className="px-4 py-3 text-xs font-bold text-slate-600">Section</th>
                                        <th className="px-4 py-3 text-xs font-bold text-slate-600">Assigned Date</th>
                                        {/* <th className="px-4 py-3 text-xs font-bold text-slate-600">Due Date</th> */}
                                        <th className="px-4 py-3 text-xs font-bold text-slate-600">Status</th>
                                        <th className="px-4 py-3 text-xs font-bold text-slate-600">Attachment</th>
                                        <th className="px-4 py-3 text-xs font-bold text-slate-600 text-center">Actions</th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-slate-100">
                                    {homeworkList.map((hw, index) => {
                                        const statusLabel = hw.is_scheduled
                                            ? 'Scheduled'
                                            : hw.status;

                                        const isOverdue =
                                            hw.due_date && new Date(hw.due_date) < new Date();

                                        let atts = hw.attachments;

                                        if (typeof atts === 'string') {
                                            try {
                                                atts = JSON.parse(atts);
                                            } catch (e) {
                                                atts = null;
                                            }
                                        }

                                        const hasAtt =
                                            atts?.doc ||
                                            atts?.image ||
                                            atts?.link ||
                                            atts?.video ||
                                            hw.attachment_url;

                                        return (
                                            <tr
                                                key={hw.id}
                                                className="hover:bg-slate-50/70 transition-colors"
                                            >
                                                <td className="px-4 py-3 text-xs text-slate-500">
                                                    {index + 1}
                                                </td>

                                                <td className="px-4 py-3">
                                                    <span className="px-2.5 py-1 rounded-full bg-cyan-50 text-cyan-700 text-[10px] font-bold uppercase">
                                                        {hw.subject_name || '—'}
                                                    </span>
                                                </td>

                                                <td className="px-4 py-3">
                                                    <div className="text-xs font-bold text-slate-800">
                                                        {hw.title || '—'}
                                                    </div>
                                                    {hw.description && (
                                                        <div className="text-[11px] text-slate-500 mt-1 max-w-xs truncate">
                                                            {hw.description}
                                                        </div>
                                                    )}
                                                </td>

                                                <td className="px-4 py-3 text-xs font-medium text-slate-700">
                                                    {hw.class_name || `Class ${hw.class_id}`}
                                                </td>

                                                <td className="px-4 py-3 text-xs text-slate-600">
                                                    {hw.section_name
                                                        ? `Sec ${hw.section_name}`
                                                        : 'All Sections'}
                                                </td>

                                                <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                                                    {hw.assigned_date
                                                        ? new Date(hw.assigned_date).toLocaleDateString('en-GB')
                                                        : '—'}
                                                </td>

                                                {/* <td className={`px-4 py-3 text-xs whitespace-nowrap ${
                                                    isOverdue
                                                        ? 'text-rose-600 font-semibold'
                                                        : 'text-slate-600'
                                                }`}>
                                                    {hw.due_date
                                                        ? new Date(hw.due_date).toLocaleDateString('en-GB')
                                                        : '—'}
                                                    {isOverdue && (
                                                        <span className="block text-[10px]">
                                                            Overdue
                                                        </span>
                                                    )}
                                                </td> */}

                                                <td className="px-4 py-3">
                                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                                                        statusLabel === 'Published'
                                                            ? 'bg-green-100 text-green-700'
                                                            : statusLabel === 'Scheduled'
                                                                ? 'bg-indigo-100 text-indigo-700'
                                                                : 'bg-slate-100 text-slate-600'
                                                    }`}>
                                                        {statusLabel || '—'}
                                                    </span>
                                                </td>

                                                <td className="px-4 py-3 text-xs">
                                                    {hasAtt ? (
                                                        <span className="inline-flex items-center gap-1 text-cyan-700 font-semibold">
                                                            <Paperclip className="w-3.5 h-3.5" />
                                                            Attached
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400">—</span>
                                                    )}
                                                </td>

                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => navigate(
                                                                `/communication/homework/${hw.id}/edit`,
                                                                { state: { homework: hw } }
                                                            )}
                                                            title="Edit Homework"
                                                            className="p-2 rounded-lg text-slate-500 hover:text-amber-700 hover:bg-amber-50"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => handleDelete(hw.id)}
                                                            title="Delete Homework"
                                                            className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
};
