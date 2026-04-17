# LinkedIn Article — Shahinaz Abdelsalam

---

**I built my own AI agent infrastructure. Then Anthropic launched the same thing.**

Last week, Anthropic announced Claude Managed Agents — a cloud service for deploying AI agents with isolated environments, state management, tool orchestration, and error recovery.

I read the announcement and thought: wait, I already built this.

Not at their scale. Not with their funding. But the same architecture, the same ideas, on a €18/month server in Paris.

Here's what happened.

---

**The problem I was solving**

I'm building Hypatia — an AI platform that helps European companies navigate EU compliance (AI Act, GDPR, NIS2). It needs AI agents that can research regulations, analyze documents, orchestrate tasks, and report back.

No managed service existed for this when I started. So I built the infrastructure myself:

- An isolated VM instead of containers
- PostgreSQL for state management
- Redis + BullMQ for task orchestration
- PM2 for process management and auto-recovery
- A supervisor agent that coordinates worker agents
- Tool routing so agents decide which capabilities to use

Sound familiar? That's exactly what Anthropic just productized.

---

**What this tells us about AI in 2026**

The fact that a solo founder and a $60B company independently converge on the same architecture says something important:

**The patterns for AI agents are stabilizing.**

We're past the hype phase. The industry is converging on how agent systems actually work in production:

1. Isolated execution environments
2. Persistent state (not just in-context memory)
3. Tool orchestration (let the model decide what to use)
4. Error recovery and retry mechanisms
5. Observability

These aren't revolutionary ideas. They're software engineering fundamentals applied to AI. The companies that win won't be the ones with the fanciest architecture — they'll be the ones solving real problems for real users.

---

**The real moat isn't infrastructure**

Anthropic can sell agent infrastructure better than I can. They have thousands of engineers. I have one VM and stubbornness.

But here's what they can't sell: understanding your users.

My next product, Athena, generates professional blog posts in French for women entrepreneurs who don't have time or skills to write their own content. These women find Canva hard. They don't know what an "agent" is. They don't care about containers or orchestration.

They care about pressing one button and getting a blog post they can publish.

The infrastructure is becoming a commodity — whether you build it yourself or buy Anthropic's managed service. The product experience is not.

---

**What I'd tell other solo founders building with AI**

1. **Don't wait for the managed service.** I built my infrastructure 6 months before Anthropic launched theirs. If I'd waited, I'd still be waiting.

2. **Start with a VM, not a platform.** A €7-18/month server with PostgreSQL, Redis, and PM2 gets you 90% of what a managed service offers. Add complexity only when you need it.

3. **The architecture isn't the hard part.** Finding users who will pay is. I have a community of French women entrepreneurs. That's worth more than any infrastructure.

4. **You don't need to be first. You need to be specific.** Anthropic builds for everyone. I build for French women entrepreneurs navigating EU compliance. Specificity wins.

---

Yes, Anthropic arrived at the same architecture.

No, that doesn't make what I built less valuable.

If anything, it validates that the patterns work. Now I can focus on what matters: making AI useful for people who don't know what AI is.

---

*I'm Shahinaz, a software engineer building AI products for the European market. Currently working on Hypatia (EU compliance) and Athena (content creation for French entrepreneurs). Building in public from Paris.*

#AI #Entrepreneurship #WomenInTech #AIAgents #Anthropic #Startup #BuildInPublic #FrenchTech
