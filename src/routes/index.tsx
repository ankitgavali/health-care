import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GlobalNavbar } from "@/components/GlobalNavbar";
import { getHomepageSettings, defaultSettings, HomepageSettings } from "@/lib/settings";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { z } from "zod";
import { toast } from "sonner";

import { useAuth, AppRole } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { roleHome } from "@/lib/case-utils";
import { Stethoscope, HeartPulse, ShieldCheck, Activity, FileText, Loader2, Users, ClipboardList, Mail, Phone, MapPin, Send, ArrowRight, CheckCircle2 } from "lucide-react";
import * as Lucide from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/")({ component: Landing });

const emailSchema = z.string().trim().email().max(255);
const passwordSchema = z.string().min(6, "At least 6 characters").max(72);

function Landing() {
  const { user, role, loading, refreshRole } = useAuth();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [settings, setSettings] = useState<HomepageSettings>(defaultSettings);

  const heroImages = [
    "/hero_bg_doctor.png",
    "/hero_bg_write.png",
    "/hero_bg_consult.png",
    "/hero_bg_care.png"
  ];
  const [heroIndex, setHeroIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroImages.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [heroImages.length]);

  useEffect(() => {
    setSettings(getHomepageSettings());
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#111827] text-[#1a1a1a] dark:text-white">
      <GlobalNavbar isFixed={false} />

      <main className="flex-1 flex flex-col relative z-[1]">

        {/* ═══════════════ HERO SECTION ═══════════════ */}
        <section className="w-full relative overflow-hidden min-h-[520px] md:min-h-[600px] flex items-center">
          {/* Sliding Background Images */}
          {heroImages.map((src, idx) => (
            <img
              key={src}
              src={src}
              alt={`Medical care ${idx + 1}`}
              className={`absolute inset-0 w-full h-full object-cover object-center transition-all duration-1000 ease-in-out ${
                idx === heroIndex ? "opacity-100 scale-100" : "opacity-0 scale-105 pointer-events-none"
              }`}
            />
          ))}
          {/* Left gradient overlay so text is readable */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#EDE8DF]/95 via-[#EDE8DF]/80 to-transparent dark:from-[#1a1f2e]/95 dark:via-[#1a1f2e]/70 dark:to-transparent" />

          {/* Text content — left side only */}
          <div className="relative z-10 w-full mx-auto max-w-7xl px-6 lg:px-10 py-20 md:py-28">
            <div key={heroIndex} className="max-w-xl space-y-6">
              <p className="text-sm font-medium tracking-widest uppercase text-[#1C3A8A] dark:text-blue-300 animate-fade-in-up">
                {settings.hospitalName}
              </p>
              <h1 className="text-4xl md:text-5xl lg:text-[3.6rem] font-serif font-normal text-[#1C3A8A] dark:text-white leading-[1.15] tracking-tight animate-fade-in-up anim-delay-150">
                {settings.hospitalName},<br />
                <span className="italic">Healthcare for All</span>
              </h1>
              <p className="text-base md:text-lg text-[#444] dark:text-gray-300 leading-relaxed max-w-md animate-fade-in-up anim-delay-300">
                {settings.heroSubtitle}
              </p>
              <div className="flex flex-wrap gap-4 pt-2 animate-fade-in-up anim-delay-450">
                <Link to="/patient">
                  <Button className="bg-[#1C3A8A] hover:bg-[#162d6e] text-white font-semibold text-base px-8 h-12 rounded-full shadow-md hover:shadow-lg transition-all duration-300 flex items-center gap-2">
                    <ClipboardList className="h-5 w-5" />
                    Book an Appointment
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════ SERVICES / WHY CHOOSE ═══════════════ */}
        <section id="services" className="w-full py-20 md:py-28 scroll-mt-20 relative overflow-hidden">
          {/* Background Image */}
          <img
            src="/services_bg.png"
            alt="Services Background"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
          {/* Overlay to ensure text readability while allowing the image to show through */}
          <div className="absolute inset-0 bg-white/70 dark:bg-[#0b1120]/80 backdrop-blur-[1px]" />
          
          <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-10">
            <div className="text-center mb-20 space-y-6 flex flex-col items-center">
              {/* Animated badge */}
              <span className="animate-badge-glow inline-flex items-center gap-2 px-5 py-2 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-[#0F5A3A] dark:text-emerald-400 text-sm font-bold tracking-widest uppercase shadow-sm border border-emerald-100 dark:border-emerald-800/50 animate-in fade-in slide-in-from-top-4 duration-700 fill-mode-both">
                <Activity className="w-4 h-4 animate-heartbeat" /> Our Services
              </span>
              {/* Shimmer gradient animated title */}
              <h2 className="relative text-4xl md:text-6xl font-extrabold tracking-tight pb-2 animate-in fade-in slide-in-from-top-6 duration-1000 delay-150 fill-mode-both">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#0a3d26] via-[#0F5A3A] via-40% to-teal-500 dark:from-white dark:via-emerald-300 dark:to-teal-400 animate-shimmer-text"
                  style={{backgroundImage: 'linear-gradient(90deg, #0a3d26 0%, #0F5A3A 25%, #34d399 50%, #0d9488 75%, #0F5A3A 100%)', backgroundSize: '200% auto'}}>
                  Why Choose {settings.hospitalName}?
                </span>
              </h2>
              {/* Subtitle with fade-up */}
              <p className="max-w-2xl mx-auto text-lg md:text-xl text-gray-600 dark:text-gray-300 leading-relaxed font-medium animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300 fill-mode-both">
                We combine advanced medical technology with compassionate care to deliver the best healthcare experience.
              </p>
            </div>

            <div className="px-4 md:px-12 w-full max-w-6xl mx-auto">
              <Carousel
                opts={{ align: "start", loop: true }}
                plugins={[
                  Autoplay({
                    delay: 3000,
                  }),
                ]}
                className="w-full animate-in fade-in slide-in-from-bottom-10 duration-1000"
              >
                <CarouselContent className="-ml-4">
                  {(settings.services || []).map((service) => {
                    const IconComponent = (Lucide as any)[service.iconName] || Lucide.HelpCircle;
                    return (
                      <CarouselItem key={service.id} className="pl-4 md:basis-1/2 lg:basis-1/3">
                        <div className="h-full group p-6 lg:p-8 rounded-3xl glass border border-white/40 dark:border-white/10 hover:bg-white/60 dark:hover:bg-white/10 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-500 flex flex-col bg-white/40 dark:bg-black/20">
                          <div className="h-16 w-16 bg-gradient-to-br from-emerald-100 to-teal-50 dark:from-emerald-900/50 dark:to-teal-900/30 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500 shadow-sm border border-white/50 dark:border-white/10">
                            <IconComponent className="h-8 w-8 text-emerald-600 dark:text-emerald-400 drop-shadow-sm" />
                          </div>
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">{service.label}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{service.desc}</p>
                        </div>
                      </CarouselItem>
                    );
                  })}
                </CarouselContent>
                <CarouselPrevious className="hidden md:flex -left-14 h-12 w-12 bg-white/50 dark:bg-black/50 backdrop-blur-md border-white/20 dark:border-white/10 hover:bg-white/80 dark:hover:bg-white/20" />
                <CarouselNext className="hidden md:flex -right-14 h-12 w-12 bg-white/50 dark:bg-black/50 backdrop-blur-md border-white/20 dark:border-white/10 hover:bg-white/80 dark:hover:bg-white/20" />
              </Carousel>
            </div>
          </div>
        </section>

        {/* ═══════════════ STATS RIBBON ═══════════════ */}
        <section className="w-full py-12 md:py-16 relative overflow-hidden">
          {/* Background Image */}
          <img
            src="/stats_bg.png"
            alt="Stats Background"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
          {/* Dark Green overlay to match hospital design, ensure text readability, and blend the image */}
          <div className="absolute inset-0 bg-[#0F5A3A]/85 dark:bg-[#0D4E32]/90" />
          {/* Stethoscope watermark backgrounds */}
          <div className="absolute right-0 bottom-0 translate-x-1/4 translate-y-1/4 opacity-10 dark:opacity-5 pointer-events-none">
            <Stethoscope className="h-64 w-64 text-white rotate-12" />
          </div>
          <div className="absolute left-0 top-0 -translate-x-1/4 -translate-y-1/4 opacity-10 dark:opacity-5 pointer-events-none">
            <Stethoscope className="h-48 w-48 text-white -rotate-12" />
          </div>
          {/* Heartbeat pulse watermark backgrounds */}
          <div className="absolute inset-0 flex items-center justify-around opacity-[0.06] dark:opacity-[0.03] pointer-events-none w-full px-12">
            <Activity className="h-32 w-32 text-white stroke-[1] animate-heartbeat" />
            <Activity className="h-32 w-32 text-white stroke-[1] animate-heartbeat hidden sm:block" style={{ animationDelay: "0.6s" }} />
            <Activity className="h-32 w-32 text-white stroke-[1] animate-heartbeat hidden md:block" style={{ animationDelay: "1.2s" }} />
          </div>

          <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {(settings.stats || []).map((s) => (
                <div key={s.id} className="space-y-2">
                  <div className="text-3xl md:text-4xl font-bold text-white">{s.value}</div>
                  <div className="text-sm text-white/70 font-medium">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════ ABOUT SECTION ═══════════════ */}
        <section id="about" className="w-full py-20 md:py-28 scroll-mt-20 relative overflow-hidden">
          {/* Background Image */}
          <img
            src="/about_bg.png"
            alt="About Background"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />
          {/* Overlay for readability */}
          <div className="absolute inset-0 bg-white/80 dark:bg-[#0f1520]/85 backdrop-blur-[2px]" />
          <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
              {/* Left — About Text */}
              <div className="space-y-8">
                <div className="space-y-4">
                  <span className="text-[#0F5A3A] dark:text-emerald-400 text-sm font-semibold tracking-widest uppercase">
                    About Us
                  </span>
                  <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[#1a1a1a] dark:text-white">
                    {settings.aboutTitle}
                  </h2>
                </div>
                <div className="space-y-5 text-gray-600 dark:text-gray-400 leading-relaxed text-base">
                  <p>{settings.aboutText1}</p>
                  <p>{settings.aboutText2}</p>
                </div>
                <div className="space-y-3 pt-2">
                  {[
                    "State-of-the-art medical facilities",
                    "Experienced and compassionate doctors",
                    "Digital-first patient experience",
                    "Transparent billing and records",
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-[#0F5A3A] dark:text-emerald-400 shrink-0" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right — Doctor Cards */}
              <div className="space-y-6">
                <h3 className="text-xl font-bold text-[#1a1a1a] dark:text-white">Meet Our Consulting Doctors</h3>
                <div className="grid grid-cols-1 gap-5">
                  {(settings.doctors || []).map((doctor) => (
                    <Dialog key={doctor.id}>
                      <DialogTrigger asChild>
                        <div className="cursor-pointer flex flex-col sm:flex-row items-center gap-5 p-5 rounded-2xl bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 shadow-sm hover:shadow-lg transition-all duration-300 hover:scale-[1.02] hover:border-emerald-200 dark:hover:border-emerald-800/50">
                          <img src={doctor.image} alt={doctor.name} className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-xl border border-gray-100 dark:border-white/10 shrink-0" />
                          <div className="space-y-1.5 text-center sm:text-left">
                            <h4 className="text-lg font-bold text-[#1a1a1a] dark:text-white hover:text-emerald-600">{doctor.name}</h4>
                            <p className="text-sm font-semibold text-[#0F5A3A] dark:text-emerald-400">{doctor.role}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{(doctor.specialties || []).join(" & ")} | {doctor.experience}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">{doctor.desc}</p>
                          </div>
                        </div>
                      </DialogTrigger>
                      <DialogContent className="max-w-md w-full !rounded-3xl border border-emerald-100 dark:border-white/10 shadow-2xl bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl p-0 overflow-hidden">
                        {/* Header gradient banner with beating heart */}
                        <div className="bg-gradient-to-br from-[#0F5A3A] via-emerald-600 to-teal-500 px-6 pt-8 pb-16 relative overflow-hidden">
                          {/* Radial light effect */}
                          <div className="absolute inset-0 opacity-20" style={{backgroundImage: 'radial-gradient(circle at 70% 50%, white 0%, transparent 60%)'}} />
                          {/* Beating heart background */}
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            {/* Ripple rings */}
                            <div className="absolute w-24 h-24 rounded-full border-2 border-white/30 animate-heart-ripple-1" />
                            <div className="absolute w-24 h-24 rounded-full border-2 border-white/20 animate-heart-ripple-2" />
                            <div className="absolute w-24 h-24 rounded-full border-2 border-white/10 animate-heart-ripple-3" />
                            {/* Big beating heart SVG */}
                            <svg viewBox="0 0 100 100" className="w-32 h-32 animate-heart-beat-strong" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M50 85 C50 85 15 60 15 35 C15 22 25 15 35 15 C41 15 47 18 50 23 C53 18 59 15 65 15 C75 15 85 22 85 35 C85 60 50 85 50 85Z" fill="white"/>
                            </svg>
                          </div>
                          <DialogTitle className="relative z-10 text-white text-xl font-bold text-center tracking-wide">{doctor.name}</DialogTitle>
                          <p className="relative z-10 text-emerald-100 text-xs text-center mt-1 font-medium tracking-widest uppercase">{doctor.role}</p>
                        </div>
                        {/* Photo overlapping header */}
                        <div className="flex flex-col items-center -mt-10 px-6 pb-6">
                          <div className="relative mb-4">
                            <div className="absolute inset-0 bg-emerald-300/30 rounded-full blur-lg animate-pulse" />
                            <img src={doctor.image} alt={doctor.name} className="relative w-20 h-20 object-cover rounded-full border-4 border-white dark:border-gray-800 shadow-lg" />
                          </div>
                          <div className="flex gap-2 flex-wrap justify-center mb-3">
                            {(doctor.specialties || []).map((s, idx) => (
                              <span key={idx} className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-full border border-emerald-100 dark:border-emerald-800/50">{s}</span>
                            ))}
                            <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-full border border-blue-100 dark:border-blue-800/50">{doctor.experience}</span>
                          </div>
                          <p className="text-gray-600 dark:text-gray-300 text-sm text-center leading-relaxed mb-4 px-2">
                            {doctor.desc}
                          </p>
                          <Link to="/patient">
                            <Button className="px-8 bg-gradient-to-r from-[#0F5A3A] to-emerald-600 hover:from-[#0a3f28] hover:to-emerald-700 text-white rounded-full shadow-md hover:shadow-lg transition-all h-9 text-sm font-semibold">
                              Book Appointment
                            </Button>
                          </Link>
                        </div>
                      </DialogContent>
                    </Dialog>
                  ))}
                  {(settings.doctors || []).length === 0 && (
                    <div className="text-center py-10 text-sm text-gray-500 italic bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/10">
                      No consulting doctors configured.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════ CONTACT SECTION ═══════════════ */}
        <section id="contact" className="w-full relative overflow-hidden py-20 md:py-28 scroll-mt-20">
          {/* Premium Background Image with zooming effect */}
          <img
            src="/contact_bg_modern.png"
            alt="Contact Background"
            className="absolute inset-0 w-full h-full object-cover object-center animate-subtle-zoom"
          />
          {/* High-end gradient overlay that blends blue-sky colors and guarantees perfect contrast in both light & dark modes */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/92 via-sky-50/85 to-white/92 dark:from-[#010915]/95 dark:via-[#021835]/90 dark:to-[#010f22]/95 backdrop-blur-[1px]" />
          
          {/* Decorative glassmorphism elements/blobs */}
          <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-blue-400/5 dark:bg-blue-500/10 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-sky-400/5 dark:bg-sky-500/10 rounded-full blur-[120px] translate-x-1/2 translate-y-1/2 pointer-events-none" />
          
          {/* Watermark heart with pulse effect */}
          <svg viewBox="0 0 100 100" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] opacity-[0.03] dark:opacity-[0.04] text-blue-900/10 dark:text-white pointer-events-none" fill="currentColor">
            <path d="M50 85 C50 85 15 60 15 35 C15 22 25 15 35 15 C41 15 47 18 50 23 C53 18 59 15 65 15 C75 15 85 22 85 35 C85 60 50 85 50 85Z" className="animate-heartbeat"/>
          </svg>

          <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-10">
            <div className="text-center mb-16 space-y-4">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50/50 dark:bg-white/10 border border-blue-100 dark:border-white/20 text-blue-700 dark:text-blue-300 text-sm font-bold tracking-widest uppercase shadow-sm backdrop-blur-sm animate-badge-glow">
                <Mail className="w-3.5 h-3.5" /> Get in Touch
              </span>
              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white drop-shadow-sm">
                Contact Information
              </h2>
              <p className="text-slate-600 dark:text-blue-100/70 text-base max-w-xl mx-auto font-medium">We're here for you 24/7. Reach out any time for appointments, queries, or emergencies.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Email */}
              <div className="group p-8 rounded-3xl border border-slate-200/80 bg-white/60 dark:border-white/10 dark:bg-white/5 backdrop-blur-xl hover:bg-white hover:border-blue-400/50 hover:shadow-2xl hover:shadow-blue-900/10 dark:hover:bg-white/15 dark:hover:border-blue-500/30 dark:hover:shadow-blue-950/50 hover:-translate-y-2 transition-all duration-500 text-center space-y-5 cursor-default relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-blue-400 to-sky-400 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-100 to-sky-50/50 border border-blue-100 dark:from-blue-500/20 dark:to-sky-600/10 dark:border-white/10 flex items-center justify-center mx-auto group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300 shadow-sm">
                  <Mail className="h-7 w-7 text-blue-600 dark:text-blue-300" />
                </div>
                <div className="space-y-1.5">
                  <div className="text-xs font-bold text-blue-600 dark:text-blue-400/90 uppercase tracking-widest">Email</div>
                  <div className="font-semibold text-base text-slate-800 dark:text-white leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors">{settings.contactEmail}</div>
                </div>
              </div>

              {/* Phone */}
              <div className="group p-8 rounded-3xl border border-slate-200/80 bg-white/60 dark:border-white/10 dark:bg-white/5 backdrop-blur-xl hover:bg-white hover:border-blue-400/50 hover:shadow-2xl hover:shadow-blue-900/10 dark:hover:bg-white/15 dark:hover:border-blue-500/30 dark:hover:shadow-blue-950/50 hover:-translate-y-2 transition-all duration-500 text-center space-y-5 cursor-default relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-blue-400 to-sky-400 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-100 to-sky-50/50 border border-blue-100 dark:from-blue-500/20 dark:to-sky-600/10 dark:border-white/10 flex items-center justify-center mx-auto group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300 shadow-sm">
                  <Phone className="h-7 w-7 text-blue-600 dark:text-blue-300" />
                </div>
                <div className="space-y-1.5">
                  <div className="text-xs font-bold text-blue-600 dark:text-blue-400/90 uppercase tracking-widest">Phone</div>
                  <div className="font-semibold text-base text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors">{settings.contactPhone}</div>
                </div>
              </div>

              {/* Emergency */}
              <div className="group p-8 rounded-3xl border border-red-200 bg-red-50/40 dark:border-red-500/20 dark:bg-red-950/20 backdrop-blur-xl hover:bg-red-50/90 hover:border-red-400 hover:shadow-2xl hover:shadow-red-900/10 dark:hover:bg-red-900/25 dark:hover:border-red-400/40 dark:hover:shadow-red-950/50 hover:-translate-y-2 transition-all duration-500 text-center space-y-5 cursor-default relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-red-500 to-rose-500 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-red-100 to-rose-50 border border-red-100 dark:from-red-500/30 dark:to-rose-600/10 dark:border-red-500/20 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-300 shadow-sm">
                  <HeartPulse className="h-7 w-7 text-red-600 dark:text-red-400 animate-heartbeat" />
                </div>
                <div className="space-y-1.5">
                  <div className="text-xs font-bold text-red-600 dark:text-red-400/90 uppercase tracking-widest">24/7 Emergency</div>
                  <div className="font-bold text-base text-red-700 dark:text-red-300 group-hover:text-red-600 dark:group-hover:text-red-200 transition-colors">Dial {settings.contactEmergency}</div>
                </div>
              </div>

              {/* Address */}
              <div className="group p-8 rounded-3xl border border-slate-200/80 bg-white/60 dark:border-white/10 dark:bg-white/5 backdrop-blur-xl hover:bg-white hover:border-blue-400/50 hover:shadow-2xl hover:shadow-blue-900/10 dark:hover:bg-white/15 dark:hover:border-blue-500/30 dark:hover:shadow-blue-950/50 hover:-translate-y-2 transition-all duration-500 text-center space-y-5 cursor-default relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-blue-400 to-sky-400 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-100 to-sky-50/50 border border-blue-100 dark:from-blue-500/20 dark:to-sky-600/10 dark:border-white/10 flex items-center justify-center mx-auto group-hover:scale-110 group-hover:rotate-6 transition-transform duration-300 shadow-sm">
                  <MapPin className="h-7 w-7 text-blue-600 dark:text-blue-300" />
                </div>
                <div className="space-y-1.5">
                  <div className="text-xs font-bold text-blue-600 dark:text-blue-400/90 uppercase tracking-widest">Address</div>
                  <div className="font-semibold text-sm text-slate-800 dark:text-white leading-relaxed group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors">{settings.contactAddress}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* ═══════════════ PREMIUM FOOTER ═══════════════ */}
      <footer className="relative overflow-hidden bg-gradient-to-br from-[#06301f] via-[#0F5A3A] to-[#0d4a30] dark:from-[#030f08] dark:via-[#07301f] dark:to-[#040f08] text-white">
        {/* Decorative background elements */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-teal-400/10 blur-3xl" />
          <svg viewBox="0 0 100 100" className="absolute right-10 top-8 w-40 h-40 opacity-[0.04]" fill="white">
            <path d="M50 85 C50 85 15 60 15 35 C15 22 25 15 35 15 C41 15 47 18 50 23 C53 18 59 15 65 15 C75 15 85 22 85 35 C85 60 50 85 50 85Z"/>
          </svg>
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-10 pt-16 pb-8">
          {/* Top columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            {/* Brand column */}
            <div className="space-y-4 lg:col-span-1">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shadow-lg">
                  <Stethoscope className="h-5 w-5 text-emerald-300" />
                </div>
                <span className="font-serif text-xl font-bold text-white">{settings.hospitalName}</span>
              </div>
              <p className="text-emerald-100/70 text-sm leading-relaxed">
                Dedicated to providing compassionate, modern healthcare for every patient — from diagnosis to recovery.
              </p>
              {/* Social icons */}
              <div className="flex gap-3 pt-1">
                {[
                  { label: "Facebook", path: "M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" },
                  { label: "Twitter", path: "M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z" },
                  { label: "Instagram", path: "M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37zM17.5 6.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM7.5 2h9A5.5 5.5 0 0 1 22 7.5v9A5.5 5.5 0 0 1 16.5 22h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2z" },
                ].map((s) => (
                  <button key={s.label} aria-label={s.label} className="h-9 w-9 rounded-full bg-white/10 border border-white/15 flex items-center justify-center hover:bg-white/20 hover:scale-110 transition-all duration-200">
                    <svg className="h-4 w-4 text-emerald-200" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d={s.path} />
                    </svg>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div className="space-y-4">
              <h4 className="text-white font-bold text-sm uppercase tracking-widest">Quick Links</h4>
              <ul className="space-y-2">
                {[
                  { label: "About Us", href: "/#about" },
                  { label: "Our Services", href: "/#services" },
                  { label: "Contact", href: "/#contact" },
                  { label: "Patient Login", href: "/auth" },
                ].map((l) => (
                  <li key={l.label}>
                    <a href={l.href} className="text-emerald-100/70 hover:text-white text-sm transition-colors flex items-center gap-2 group">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 group-hover:scale-150 transition-transform" />
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Services */}
            <div className="space-y-4">
              <h4 className="text-white font-bold text-sm uppercase tracking-widest">Services</h4>
              <ul className="space-y-2">
                {["Digital Case Papers", "Role-Based Access", "End-to-End Workflow", "Instant Billing", "Emergency Care"].map((s) => (
                  <li key={s}>
                    <span className="text-emerald-100/70 text-sm flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-400/60" />
                      {s}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div className="space-y-4">
              <h4 className="text-white font-bold text-sm uppercase tracking-widest">Contact Us</h4>
              <ul className="space-y-3">
                <li className="flex items-start gap-3 text-sm text-emerald-100/70">
                  <Phone className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                  <span>{settings.contactPhone}</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-emerald-100/70">
                  <Mail className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                  <span>{settings.contactEmail}</span>
                </li>
                <li className="flex items-start gap-3 text-sm text-emerald-100/70">
                  <MapPin className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                  <span>{settings.contactAddress}</span>
                </li>
              </ul>
              <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/20 border border-red-400/30 text-red-300 text-xs font-bold">
                <HeartPulse className="h-3.5 w-3.5 animate-heartbeat" />
                Emergency: {settings.contactEmergency}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-emerald-100/50">
            <span>© {new Date().getFullYear()} {settings.hospitalName} General Hospital. All rights reserved.</span>
            <div className="flex gap-5">
              <span className="hover:text-white cursor-pointer transition-colors">Privacy Policy</span>
              <span className="hover:text-white cursor-pointer transition-colors">Terms of Service</span>
              <span className="hover:text-white cursor-pointer transition-colors">Cookie Policy</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
