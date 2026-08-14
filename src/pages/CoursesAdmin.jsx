import React, { useEffect, useState } from "react";
import { BookOpen, CloudUpload, ShieldCheck } from "lucide-react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import StatusPanel from "@/components/StatusPanel";
import { usePreferences } from "@/lib/preferences";
import { invokeAppFunction } from "@/services/marketService";

const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const emptyCourse = { code: "", title_ar: "", title_en: "", description_ar: "", description_en: "", visibility: "public", market_code: "SA_MAIN", display_order: 0 };

const copy = {
  ar: {
    pageTitle: "إدارة الدورات والفيديو",
    pageDescription: "أضف الدورات وارفع المقاطع إلى التخزين الخاص داخل المنصة، ثم انشرها للجمهور أو لمشتركي سوق محدد.",
    addCourse: "إضافة دورة",
    public: "عامة في صفحة الهبوط",
    market: "خاصة بمشتركي سوق",
    saveDraft: "حفظ كمسودة",
    uploadVideo: "رفع مقطع",
    titleAr: "عنوان المقطع بالعربية",
    titleEn: "عنوان المقطع بالإنجليزية",
    upload: "رفع المقطع بشكل خاص",
    uploading: "جارٍ رفع المقطع وحفظه بشكل خاص…",
    storageNote: "يُحفظ المقطع داخل التخزين الخاص للمنصة. الحد الأقصى لكل فيديو 100 ميجابايت.",
    courses: "الدورات وحالة النشر",
    publish: "نشر بعد فحص جاهزية المقاطع",
    uploaded: "اكتمل رفع المقطع وحُفظ داخل التخزين الخاص.",
    published: "نُشرت الدورة بعد التحقق من جاهزية جميع المقاطع.",
    tooLarge: "حجم الفيديو يتجاوز 100 ميجابايت.",
    invalidType: "اختر ملف فيديو مدعوماً.",
    ready: "جاهز",
  },
  en: {
    pageTitle: "Course and video management",
    pageDescription: "Create courses, upload videos to the platform's private storage, then publish them publicly or to an approved market.",
    addCourse: "Add course",
    public: "Public on the landing page",
    market: "Approved market members only",
    saveDraft: "Save draft",
    uploadVideo: "Upload video",
    titleAr: "Arabic lesson title",
    titleEn: "English lesson title",
    upload: "Upload to private storage",
    uploading: "Uploading and securing the video…",
    storageNote: "The video is stored in the platform's private storage. Maximum size is 100 MB per video.",
    courses: "Courses and publishing status",
    publish: "Publish after readiness check",
    uploaded: "The video was uploaded to private storage.",
    published: "The course was published after all videos passed the readiness check.",
    tooLarge: "The video exceeds the 100 MB limit.",
    invalidType: "Choose a supported video file.",
    ready: "Ready",
  },
};

export default function CoursesAdmin() {
  const { language } = usePreferences();
  const t = copy[language];
  const [state, setState] = useState({ loading: true, uploading: false, courses: [], lessons: {}, error: "", notice: "" });
  const [course, setCourse] = useState(emptyCourse);
  const [lesson, setLesson] = useState({ course_id: "", title_ar: "", title_en: "", display_order: 0, file: null });

  async function load() {
    try {
      const data = await invokeAppFunction("trainingContent", { action: "owner_list" });
      setState((current) => ({ ...current, loading: false, ...data, error: "" }));
      setLesson((current) => ({ ...current, course_id: current.course_id || data.courses?.[0]?.id || "" }));
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: error?.response?.data?.error || error.message }));
    }
  }

  useEffect(() => { load(); }, []);

  async function saveCourse(event) {
    event.preventDefault();
    try {
      await invokeAppFunction("trainingContent", { action: "save_course", ...course });
      setCourse(emptyCourse);
      await load();
    } catch (error) {
      setState((current) => ({ ...current, error: error?.response?.data?.error || error.message }));
    }
  }

  async function upload(event) {
    event.preventDefault();
    const file = lesson.file;
    if (!file) return;
    if (!file.type.startsWith("video/")) return setState((current) => ({ ...current, error: t.invalidType }));
    if (file.size > MAX_VIDEO_BYTES) return setState((current) => ({ ...current, error: t.tooLarge }));
    setState((current) => ({ ...current, uploading: true, error: "", notice: "" }));
    try {
      const uploaded = await base44.integrations.Core.UploadPrivateFile({ file });
      const fileUri = uploaded && "file_uri" in uploaded ? uploaded.file_uri : "";
      if (!fileUri) throw new Error(language === "ar" ? "تعذر حفظ الفيديو في التخزين الخاص" : "The video could not be stored privately");
      await invokeAppFunction("trainingContent", {
        action: "save_lesson_upload",
        course_id: lesson.course_id,
        title_ar: lesson.title_ar,
        title_en: lesson.title_en,
        display_order: lesson.display_order,
        file_uri: fileUri,
        file_name: file.name,
        mime_type: file.type,
        file_size_bytes: file.size,
      });
      setLesson((current) => ({ ...current, title_ar: "", title_en: "", display_order: 0, file: null }));
      await load();
      setState((current) => ({ ...current, uploading: false, notice: t.uploaded }));
    } catch (error) {
      setState((current) => ({ ...current, uploading: false, error: error?.response?.data?.error || error.message }));
    }
  }

  async function publish(courseId) {
    try {
      await invokeAppFunction("trainingContent", { action: "publish_course", course_id: courseId });
      await load();
      setState((current) => ({ ...current, notice: t.published }));
    } catch (error) {
      setState((current) => ({ ...current, error: error?.response?.data?.error || error.message }));
    }
  }

  return <>
    <PageHeader title={t.pageTitle} description={t.pageDescription} />
    <div className="mx-auto grid max-w-[1800px] gap-5 px-4 pb-10 xl:grid-cols-3">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d192a]">
        <h2 className="flex items-center gap-2 font-black"><BookOpen size={18} />{t.addCourse}</h2>
        <form className="mt-4 grid gap-2" onSubmit={saveCourse}>
          {["code", "title_ar", "title_en", "description_ar", "description_en"].map((key) => <input key={key} className="form-input" required={!key.startsWith("description")} placeholder={key} value={course[key]} onChange={(event) => setCourse({ ...course, [key]: event.target.value })} />)}
          <select className="form-input" value={course.visibility} onChange={(event) => setCourse({ ...course, visibility: event.target.value })}><option value="public">{t.public}</option><option value="market">{t.market}</option></select>
          {course.visibility === "market" && <select className="form-input" value={course.market_code} onChange={(event) => setCourse({ ...course, market_code: event.target.value })}>{["SA_MAIN", "US_OPTIONS", "US_BENCHMARKS"].map((item) => <option key={item}>{item}</option>)}</select>}
          <button className="primary-button">{t.saveDraft}</button>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d192a]">
        <h2 className="flex items-center gap-2 font-black"><CloudUpload size={18} />{t.uploadVideo}</h2>
        <form className="mt-4 grid gap-2" onSubmit={upload}>
          <select className="form-input" required value={lesson.course_id} onChange={(event) => setLesson({ ...lesson, course_id: event.target.value })}>{state.courses.map((item) => <option key={item.id} value={item.id}>{language === "ar" ? item.title_ar : item.title_en}</option>)}</select>
          <input className="form-input" required placeholder={t.titleAr} value={lesson.title_ar} onChange={(event) => setLesson({ ...lesson, title_ar: event.target.value })} />
          <input className="form-input" required placeholder={t.titleEn} value={lesson.title_en} onChange={(event) => setLesson({ ...lesson, title_en: event.target.value })} />
          <input required accept="video/*" type="file" onChange={(event) => setLesson({ ...lesson, file: event.target.files?.[0] || null })} />
          <button className="primary-button" disabled={state.uploading || !lesson.course_id}>{state.uploading ? t.uploading : t.upload}</button>
        </form>
        <div className="mt-4 rounded-xl bg-slate-100 p-3 text-xs leading-6 dark:bg-slate-900">{t.storageNote}</div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d192a]">
        <h2 className="flex items-center gap-2 font-black"><ShieldCheck size={18} />{t.courses}</h2>
        {state.loading ? <StatusPanel loading /> : <div className="mt-4 space-y-3">{state.courses.map((item) => <article key={item.id} className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700"><b>{language === "ar" ? item.title_ar : item.title_en}</b><p className="text-slate-500">{item.visibility} · {item.status}</p><ul className="mt-2 text-xs">{(state.lessons[item.id] || []).map((video) => <li key={video.id}>{language === "ar" ? video.title_ar : video.title_en} — {video.storage_status === "ready" ? t.ready : video.storage_status}</li>)}</ul>{item.status === "draft" && <button className="secondary-button mt-3" onClick={() => publish(item.id)}>{t.publish}</button>}</article>)}</div>}
      </section>
    </div>
    {state.error && <div className="fixed bottom-4 end-4 z-[100] max-w-sm rounded-xl bg-red-950 p-4 text-sm text-red-200">{state.error}</div>}
    {state.notice && <div className="fixed bottom-4 start-4 z-[100] max-w-sm rounded-xl bg-emerald-950 p-4 text-sm text-emerald-200">{state.notice}</div>}
  </>;
}
