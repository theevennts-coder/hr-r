import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles, Building2, Users, Shield } from "lucide-react";
import { Link } from "react-router-dom";

const HeroSection = () => (
  <section className="relative min-h-[90vh] bg-gradient-hero flex items-center overflow-hidden">
    {/* Decorative elements */}
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute top-20 left-10 w-72 h-72 rounded-full bg-primary/5 blur-3xl animate-pulse-glow" />
      <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full bg-accent/5 blur-3xl animate-pulse-glow" style={{ animationDelay: "1.5s" }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-primary/10 animate-float" />
    </div>

    <div className="container mx-auto px-6 relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="max-w-3xl mx-auto text-center"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 mb-8"
        >
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-primary">مدعوم بالذكاء الاصطناعي</span>
        </motion.div>

        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6">
          <span className="text-primary-foreground" style={{ color: 'hsl(0 0% 95%)' }}>بنك المواهب</span>
          <br />
          <span className="text-gradient-primary">العربي الذكي</span>
        </h1>

        <p className="text-lg md:text-xl leading-relaxed mb-10 max-w-2xl mx-auto" style={{ color: 'hsl(220 15% 65%)' }}>
          منصة توظيف مجانية بالكامل تربط الشركات بأفضل الكفاءات عبر وكلاء ذكاء اصطناعي
          يحللون السير الذاتية ويطابقون المرشحين بالوظائف المناسبة تلقائياً
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/register?type=candidate">
            <Button variant="hero" size="xl">
              <Users className="w-5 h-5" />
              سجّل كمرشح
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <Link to="/register?type=company">
            <Button variant="heroOutline" size="xl">
              <Building2 className="w-5 h-5" />
              سجّل كشركة
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  </section>
);

const features = [
  {
    icon: Sparkles,
    title: "تحليل ذكي للسيرة الذاتية",
    description: "وكيل ذكاء اصطناعي يقرأ سيرتك الذاتية ويستخرج المهارات والخبرات بدقة عالية",
  },
  {
    icon: Users,
    title: "مطابقة تلقائية",
    description: "خوارزمية تسجيل ذكية تطابق المرشحين بالوظائف بناءً على المهارات والخبرة",
  },
  {
    icon: Shield,
    title: "خصوصية وأمان",
    description: "بياناتك مشفرة ومحمية. روابط مؤقتة للسير الذاتية وسجلات تدقيق لا تُمس",
  },
  {
    icon: Building2,
    title: "مجاني بالكامل",
    description: "لا رسوم خفية. المنصة مجانية للشركات والمرشحين على حد سواء",
  },
];

const FeaturesSection = () => (
  <section className="py-24 bg-background">
    <div className="container mx-auto px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <h2 className="text-3xl md:text-4xl font-bold mb-4">لماذا نحن مختلفون؟</h2>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
          نستخدم أحدث تقنيات الذكاء الاصطناعي لجعل التوظيف أسرع وأذكى وأكثر عدالة
        </p>
      </motion.div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((feature, i) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="group p-6 rounded-2xl bg-card shadow-card hover:shadow-card-hover transition-all duration-300 border border-border/50"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
              <feature.icon className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

const HowItWorksSection = () => {
  const steps = [
    { number: "01", title: "أنشئ حسابك", description: "سجّل كمرشح أو شركة في أقل من دقيقة" },
    { number: "02", title: "ارفع سيرتك الذاتية", description: "الذكاء الاصطناعي يحلل سيرتك ويستخرج بياناتك تلقائياً" },
    { number: "03", title: "احصل على مطابقات ذكية", description: "نرسل لك أفضل الوظائف المطابقة لمهاراتك" },
  ];

  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">كيف يعمل النظام؟</h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="text-center"
            >
              <div className="text-5xl font-bold text-gradient-primary mb-4">{step.number}</div>
              <h3 className="text-xl font-bold mb-2">{step.title}</h3>
              <p className="text-muted-foreground">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const CTASection = () => (
  <section className="py-24 bg-gradient-hero relative overflow-hidden">
    <div className="absolute inset-0">
      <div className="absolute top-0 left-1/4 w-64 h-64 rounded-full bg-primary/5 blur-3xl" />
    </div>
    <div className="container mx-auto px-6 relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center max-w-2xl mx-auto"
      >
        <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: 'hsl(0 0% 95%)' }}>
          ابدأ رحلتك المهنية الآن
        </h2>
        <p className="text-lg mb-8" style={{ color: 'hsl(220 15% 65%)' }}>
          انضم إلى آلاف المرشحين والشركات الذين يستخدمون الذكاء الاصطناعي للتوظيف
        </p>
        <Link to="/register">
          <Button variant="hero" size="xl">
            ابدأ مجاناً
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
      </motion.div>
    </div>
  </section>
);

const Footer = () => (
  <footer className="py-12 bg-card border-t border-border">
    <div className="container mx-auto px-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="text-xl font-bold text-gradient-primary font-heading">وظّفني</div>
        <div className="flex gap-6 text-sm text-muted-foreground">
          <Link to="/about" className="hover:text-primary transition-colors">عن المنصة</Link>
          <Link to="/privacy" className="hover:text-primary transition-colors">سياسة الخصوصية</Link>
          <Link to="/contact" className="hover:text-primary transition-colors">تواصل معنا</Link>
        </div>
        <p className="text-sm text-muted-foreground">© 2026 وظّفني. جميع الحقوق محفوظة</p>
      </div>
    </div>
  </footer>
);

const LandingPage = () => (
  <div className="min-h-screen">
    <HeroSection />
    <FeaturesSection />
    <HowItWorksSection />
    <CTASection />
    <Footer />
  </div>
);

export default LandingPage;
