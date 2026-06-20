<!-- 
  Purpose: Document the 25 strict AI Development Rules that govern 
  file sizes, code modularity, separation of concerns, and workflows.
-->
# Cliniq-OX: AI Development Rules

All AI code generation, architectural decisions, and modifications must strictly follow these rules to ensure the codebase remains maintainable for years to come.

---

## The 25 Core Rules

1. **Read Docs First:** Read all documentation files before writing any code.
2. **File Size Cap:** Never create files larger than 300 lines.
3. **Prefer Under 200:** Prefer files under 200 lines whenever possible.
4. **Single Component:** One component per file.
5. **Single Service:** One service per module.
6. **Single Responsibility:** One responsibility per file.
7. **Decoupled UI:** Do not place business logic inside UI components.
8. **Layer Separation:** Keep UI, business logic, API logic, and database logic separated.
9. **No Direct DB Access:** Do not directly access the database from API routing code.
10. **Data Layer Flow:** Routes → Controllers → Services → Database.
11. **Update Changelog:** Update `docs/changelog.md` after every codebase modification.
12. **Update API Spec:** Update `docs/api-spec.md` whenever an API endpoint changes.
13. **Update DB Schema:** Update `docs/database-schema.md` whenever schema changes.
14. **Update Requirements:** Update `docs/requirements.md` when a feature's scope changes.
15. **Scope Preservation:** Never rewrite or modify unrelated files.
16. **Explicit Paths:** Generate complete file paths for every new file.
17. **Explain Dependencies:** Explain all dependencies before generating any code.
18. **Reuse Code:** Reuse existing components whenever possible.
19. **Create Reusables:** Create reusable shared components instead of duplicating code.
20. **Backward Compatibility:** Maintain backward compatibility unless specifically instructed otherwise.
21. **Naming Standards:** Follow consistent naming conventions across the project.
22. **Specs First:** Every feature must have its own specification document under `docs/specs/` before implementation.
23. **Plan First:** Create a feature implementation plan before generating code.
24. **Chunked Generation:** Generate code in small reviewable chunks instead of one large file.
25. **Impact Mapping:** If a change affects multiple files, list all affected files first.
