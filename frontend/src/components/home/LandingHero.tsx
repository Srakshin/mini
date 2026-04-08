"use client";

import {type FormEvent, useEffect} from "react";
import {ArrowRight, Mail} from "lucide-react";
import {motion, stagger, useAnimate} from "motion/react";
import {siCnn, siGoogle, siMeta, siNetflix, siTechcrunch} from "simple-icons";
import Floating, {FloatingElement} from "@/components/ui/parallax-floating";
import {Button} from "@/components/ui/button";
import {Card, CardContent} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {cn} from "@/lib/utils";

type LandingHeroProps = {
    email: string;
    onEmailChange: (value: string) => void;
    onContinue: () => void;
};

const floatingImageClassName = "overflow-hidden rounded-[1.75rem] border border-white/15 bg-white/10 shadow-[0_24px_80px_rgba(0,0,0,0.25)] backdrop-blur";

const toDataUri = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

const createIconSvg = (path: string, color: string, title: string) => toDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" role="img" aria-label="${title}">
  <title>${title}</title>
  <path fill="${color}" d="${path}" />
</svg>
`);

const createWordmarkSvg = ({
    title,
    background,
    foreground,
}: {
    title: string;
    background: string;
    foreground: string;
}) => toDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 160" role="img" aria-label="${title}">
  <rect width="320" height="160" rx="28" fill="${background}" />
  <text x="160" y="92" text-anchor="middle" font-size="42" font-family="Arial, Helvetica, sans-serif" font-weight="700" fill="${foreground}">
    ${title}
  </text>
</svg>
`);

const floatingLogos = [
    {
        src: createIconSvg(siGoogle.path, `#${siGoogle.hex}`, siGoogle.title),
        title: "Google",
    },
    {
        src: createWordmarkSvg({title: "Microsoft", background: "#F3F4F6", foreground: "#2563EB"}),
        title: "Microsoft",
    },
    {
        src: createWordmarkSvg({title: "Amazon", background: "#111827", foreground: "#F59E0B"}),
        title: "Amazon",
    },
    {
        src: createIconSvg(siMeta.path, `#${siMeta.hex}`, siMeta.title),
        title: "Meta",
    },
    {
        src: createIconSvg(siNetflix.path, `#${siNetflix.hex}`, siNetflix.title),
        title: "Netflix",
    },
    {
        src: createWordmarkSvg({title: "Reuters", background: "#FFF7ED", foreground: "#F97316"}),
        title: "Reuters",
    },
    {
        src: createWordmarkSvg({title: "Bloomberg", background: "#111827", foreground: "#F59E0B"}),
        title: "Bloomberg",
    },
    {
        src: createWordmarkSvg({title: "BBC", background: "#111111", foreground: "#FFFFFF"}),
        title: "BBC",
    },
    {
        src: createIconSvg(siCnn.path, `#${siCnn.hex}`, siCnn.title),
        title: "CNN",
    },
    {
        src: createIconSvg(siTechcrunch.path, `#${siTechcrunch.hex}`, siTechcrunch.title),
        title: "TechCrunch",
    },
];

const LogoTile = ({
    src,
    alt,
    className,
}: {
    src: string;
    alt: string;
    className?: string;
}) => (
    <figure className={cn(floatingImageClassName, "flex items-center justify-center bg-white/[0.04] p-6", className)}>
        <img alt={alt} className="h-16 w-full object-contain xl:h-20" src={src} />
    </figure>
);

export const LandingHero = ({email, onEmailChange, onContinue}: LandingHeroProps) => {
    const [scope, animate] = useAnimate();

    useEffect(() => {
        animate("[data-floating-media]", {opacity: [0, 1], y: [12, 0]}, {
            duration: 0.6,
            delay: stagger(0.12),
        });
    }, [animate]);

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        onContinue();
    };

    return (
        <section className="relative isolate overflow-hidden rounded-[2rem] border border-white/10 bg-black px-4 py-6 text-white shadow-[0_30px_120px_rgba(0,0,0,0.65)] sm:px-6 lg:min-h-[720px] lg:px-10 lg:py-10">
            <div className="relative z-20 flex min-h-[640px] items-center justify-center" ref={scope}>
                <motion.div
                    className="mx-auto flex w-full max-w-3xl flex-col items-center text-center"
                    initial={{opacity: 0, y: 16}}
                    animate={{opacity: 1, y: 0}}
                    transition={{duration: 0.8, ease: "easeOut"}}
                >
                    <h1 className="font-calendas max-w-4xl text-balance text-5xl italic leading-none text-white sm:text-6xl lg:text-7xl">
                        Enter your mail
                    </h1>

                    <Card className="mt-10 w-full max-w-2xl border-white/10 bg-slate-950/55 text-white shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
                        <CardContent className="p-4 sm:p-6">
                            <form onSubmit={handleSubmit}>
                                <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                                    <label className="relative block">
                                        <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                        <Input
                                            className="h-12 border-white/10 bg-white/5 pl-11 text-white placeholder:text-slate-400"
                                            placeholder="you@example.com"
                                            type="email"
                                            value={email}
                                            onChange={(event) => onEmailChange(event.target.value)}
                                        />
                                    </label>
                                    <Button className="h-12 rounded-xl bg-cyan-400 px-6 text-slate-950 hover:bg-cyan-300" size="lg" type="submit">
                                        Continue
                                        <ArrowRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            <Floating className="pointer-events-none hidden overflow-hidden lg:block" sensitivity={-0.45}>
                <FloatingElement className="left-[6%] top-[10%]" data-floating-media depth={0.8}>
                    <LogoTile alt={floatingLogos[0].title} className="w-32 rotate-[-10deg] xl:w-40" src={floatingLogos[0].src} />
                </FloatingElement>

                <FloatingElement className="left-[20%] top-[58%]" data-floating-media depth={1.6}>
                    <LogoTile alt={floatingLogos[1].title} className="w-40 rotate-[8deg] xl:w-48" src={floatingLogos[1].src} />
                </FloatingElement>

                <FloatingElement className="left-[72%] top-[12%]" data-floating-media depth={1.2}>
                    <LogoTile alt={floatingLogos[2].title} className="w-36 rotate-[8deg] xl:w-44" src={floatingLogos[2].src} />
                </FloatingElement>

                <FloatingElement className="right-[8%] top-[54%]" data-floating-media depth={1.9}>
                    <LogoTile alt={floatingLogos[3].title} className="w-40 rotate-[-8deg] xl:w-48" src={floatingLogos[3].src} />
                </FloatingElement>

                <FloatingElement className="left-[44%] top-[74%]" data-floating-media depth={3}>
                    <LogoTile alt={floatingLogos[4].title} className="w-32 rotate-[-5deg] xl:w-40" src={floatingLogos[4].src} />
                </FloatingElement>

                <FloatingElement className="left-[60%] top-[68%]" data-floating-media depth={3.2}>
                    <LogoTile alt={floatingLogos[5].title} className="w-36 rotate-[6deg] xl:w-44" src={floatingLogos[5].src} />
                </FloatingElement>

                <FloatingElement className="left-[11%] top-[74%]" data-floating-media depth={2.2}>
                    <LogoTile alt={floatingLogos[6].title} className="w-36 rotate-[10deg] xl:w-44" src={floatingLogos[6].src} />
                </FloatingElement>

                <FloatingElement className="left-[30%] top-[16%]" data-floating-media depth={1.4}>
                    <LogoTile alt={floatingLogos[7].title} className="w-32 rotate-[-7deg] xl:w-40" src={floatingLogos[7].src} />
                </FloatingElement>

                <FloatingElement className="right-[22%] top-[72%]" data-floating-media depth={2.8}>
                    <LogoTile alt={floatingLogos[8].title} className="w-32 rotate-[7deg] xl:w-40" src={floatingLogos[8].src} />
                </FloatingElement>

                <FloatingElement className="right-[18%] top-[18%]" data-floating-media depth={1.7}>
                    <LogoTile alt={floatingLogos[9].title} className="w-40 rotate-[-5deg] xl:w-48" src={floatingLogos[9].src} />
                </FloatingElement>
            </Floating>
        </section>
    );
};
