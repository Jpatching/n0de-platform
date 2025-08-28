# Claude Memory for PV3 Project

## CRITICAL: Agent Usage Requirements

**IMPORTANT**: For EVERY task, you MUST identify and use the appropriate specialized agents instead of attempting to complete the work yourself. This ensures:
- Higher quality outputs from domain experts
- Consistent code style and patterns
- Better problem-solving approaches
- Proper separation of concerns

### Agent Selection Guidelines

1. **UI/UX Design Tasks**
   - Use `ui-designer` for design decisions, layouts, visual hierarchy
   - Use `visual-storyteller` for illustrations, infographics, presentations
   - Use `brand-guardian` for brand consistency and guidelines
   - Use `whimsy-injector` after UI changes for delightful touches

2. **Frontend Development**
   - Use `frontend-developer` for React components, state management, UI implementation
   - Use `mobile-app-builder` for React Native or mobile-specific features

3. **Backend Development**
   - Use `backend-architect` for APIs, databases, server logic
   - Use `devops-automator` for deployment, CI/CD, infrastructure

4. **AI/ML Features**
   - Use `ai-engineer` for implementing AI features, LLM integration, ML pipelines

5. **Testing & Quality**
   - Use `test-writer-fixer` after code changes to ensure tests pass
   - Use `performance-benchmarker` for speed optimization
   - Use `api-tester` for API performance and load testing

6. **Product & Strategy**
   - Use `tiktok-strategist` for TikTok marketing and viral content
   - Use `app-store-optimizer` for ASO and app listings
   - Use `trend-researcher` for market research and opportunities
   - Use `sprint-prioritizer` for feature prioritization
   - Use `feedback-synthesizer` for analyzing user feedback

7. **Project Management**
   - Use `rapid-prototyper` for new MVPs and experiments
   - Use `experiment-tracker` for A/B tests and feature flags
   - Use `project-shipper` for launches and go-to-market
   - Use `studio-producer` for cross-team coordination
   - Use `studio-coach` for complex multi-agent coordination

8. **Support & Operations**
   - Use `support-responder` for customer support setup
   - Use `legal-compliance-checker` for legal requirements
   - Use `infrastructure-maintainer` for system health
   - Use `analytics-reporter` for metrics and insights

### Usage Pattern

Always follow this pattern:
1. Analyze the user's request
2. Identify which agent(s) are most relevant
3. Use the Task tool with the appropriate subagent_type
4. Let the specialized agents complete the work
5. Only summarize or coordinate between agents

### Example

```
User: "Redesign the loading screen"
Claude: I'll use the ui-designer and frontend-developer agents to redesign the loading screen.
[Uses Task tool with ui-designer first, then frontend-developer to implement]
```

## Project-Specific Information

### PV3 Theme
- Primary accent: #E6E6E6
- Secondary accent: #9333EA
- Font: Audiowide
- Success color: #10B981
- Game-style UI with glows and gradients

### Key Files
- Demo loader: `/pv3-demo/components/EnhancedDemoLoader.tsx`
- Main frontend components in `/pv3-demo/components/`

### Current Focus
- Professional game-quality loading screens
- Viral TikTok-ready features
- 6-day development cycles
- Demo mode for user acquisition