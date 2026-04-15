const express = require('express');
const router = express.Router();
const { Profile, Employment, Skill, User, Degree, Certification, Licence, ProfessionalCourse } = require('../../models');
const { fn, col, literal, Op } = require('sequelize');
const requireApiKey = require('../../middlewares/apiKeyAuth');
const checkPermission = require('../../middlewares/checkPermission');

/**
 * @swagger
 * tags:
 *   name: Analytics
 *   description: Chart data aggregation endpoints (requires read:analytics permission)
 */

//All routes require a valid API key with 'read:analytics' scope
router.use(requireApiKey);
router.use(checkPermission('read:analytics'));

//Helper: Build a WHERE clause from query filters
const buildProfileFilter = (query) => {
    const where = {};
    if (query.programme) where.programme = query.programme;
    if (query.sector) where.industry_sector = query.sector;
    if (query.graduation_year) {
        where.graduation_date = {
            [Op.and]: [
                { [Op.gte]: `${query.graduation_year}-01-01` },
                { [Op.lte]: `${query.graduation_year}-12-31` }
            ]
        };
    }
    return where;
};

//1. Employment by Industry Sector (Bar Chart)
/**
 * @swagger
 * /api/analytics/by-sector:
 *   get:
 *     summary: Employment count grouped by industry sector
 *     tags: [Analytics]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: programme
 *         schema: { type: string }
 *       - in: query
 *         name: graduation_year
 *         schema: { type: integer }
 *       - in: query
 *         name: sector
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Array of {sector, count}
 */
router.get('/by-sector', async (req, res) => {
    try {
        const profileWhere = buildProfileFilter(req.query);
        const profileIds = await Profile.findAll({
            where: profileWhere,
            attributes: ['id'],
            raw: true
        });
        const ids = profileIds.map(p => p.id);

        const data = await Employment.findAll({
            where: ids.length > 0 ? { profile_id: { [Op.in]: ids } } : {},
            attributes: [
                ['industry_sector', 'sector'],
                [fn('COUNT', col('id')), 'count']
            ],
            group: ['industry_sector'],
            order: [[literal('count'), 'DESC']],
            raw: true
        });

        res.json({ chart: 'employment_by_sector', data });
    } catch (error) {
        console.error('Analytics by-sector error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

//2. Alumni Distribution by Programme (Pie Chart)
/**
 * @swagger
 * /api/analytics/by-programme:
 *   get:
 *     summary: Alumni count grouped by programme
 *     tags: [Analytics]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Array of {programme, count}
 */
router.get('/by-programme', async (req, res) => {
    try {
        const where = buildProfileFilter(req.query);
        const data = await Profile.findAll({
            where,
            attributes: [
                'programme',
                [fn('COUNT', col('id')), 'count']
            ],
            group: ['programme'],
            order: [[literal('count'), 'DESC']],
            raw: true
        });

        res.json({ chart: 'alumni_by_programme', data });
    } catch (error) {
        console.error('Analytics by-programme error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

//3. Alumni by Current Industry (Doughnut Chart)
/**
 * @swagger
 * /api/analytics/by-industry:
 *   get:
 *     summary: Alumni count grouped by current industry sector
 *     tags: [Analytics]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Array of {industry, count}
 */
router.get('/by-industry', async (req, res) => {
    try {
        const where = buildProfileFilter(req.query);
        const data = await Profile.findAll({
            where,
            attributes: [
                ['industry_sector', 'industry'],
                [fn('COUNT', col('id')), 'count']
            ],
            group: ['industry_sector'],
            order: [[literal('count'), 'DESC']],
            raw: true
        });

        res.json({ chart: 'alumni_by_industry', data });
    } catch (error) {
        console.error('Analytics by-industry error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

//4. Graduation Trends Over Time (Line Chart)
/**
 * @swagger
 * /api/analytics/graduation-trends:
 *   get:
 *     summary: Alumni count per graduation year
 *     tags: [Analytics]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Array of {year, count}
 */
router.get('/graduation-trends', async (req, res) => {
    try {
        const where = buildProfileFilter(req.query);
        const data = await Profile.findAll({
            where,
            attributes: [
                [fn('YEAR', col('graduation_date')), 'year'],
                [fn('COUNT', col('id')), 'count']
            ],
            group: [fn('YEAR', col('graduation_date'))],
            order: [[fn('YEAR', col('graduation_date')), 'ASC']],
            raw: true
        });

        res.json({ chart: 'graduation_trends', data });
    } catch (error) {
        console.error('Analytics graduation-trends error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

//5. Curriculum Skills Gap (Radar Chart)
/**
 * @swagger
 * /api/analytics/skills-gap:
 *   get:
 *     summary: Skill frequency analysis — university vs industry skills
 *     tags: [Analytics]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Array of {skill, university_count, industry_count}
 */
router.get('/skills-gap', async (req, res) => {
    try {
        const profileWhere = buildProfileFilter(req.query);
        const profileIds = await Profile.findAll({
            where: profileWhere,
            attributes: ['id'],
            raw: true
        });
        const ids = profileIds.map(p => p.id);

        const whereClause = ids.length > 0 ? { profile_id: { [Op.in]: ids } } : {};

        // Get all skills grouped by name and source
        const rawSkills = await Skill.findAll({
            where: whereClause,
            attributes: [
                'skill_name',
                'source',
                [fn('COUNT', col('id')), 'count']
            ],
            group: ['skill_name', 'source'],
            raw: true
        });

        // Pivot into { skill, university_count, industry_count }
        const skillMap = {};
        for (const row of rawSkills) {
            if (!skillMap[row.skill_name]) {
                skillMap[row.skill_name] = { skill: row.skill_name, university_count: 0, industry_count: 0 };
            }
            if (row.source === 'university') {
                skillMap[row.skill_name].university_count = parseInt(row.count);
            } else {
                skillMap[row.skill_name].industry_count = parseInt(row.count);
            }
        }

        const data = Object.values(skillMap).sort((a, b) =>
            (b.university_count + b.industry_count) - (a.university_count + a.industry_count)
        );

        res.json({ chart: 'skills_gap', data });
    } catch (error) {
        console.error('Analytics skills-gap error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

//6. Most Common Job Titles (Horizontal Bar Chart)
/**
 * @swagger
 * /api/analytics/top-job-titles:
 *   get:
 *     summary: Top 10 most common job titles
 *     tags: [Analytics]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Array of {role, count}
 */
router.get('/top-job-titles', async (req, res) => {
    try {
        const profileWhere = buildProfileFilter(req.query);
        const profileIds = await Profile.findAll({
            where: profileWhere,
            attributes: ['id'],
            raw: true
        });
        const ids = profileIds.map(p => p.id);

        const data = await Employment.findAll({
            where: ids.length > 0 ? { profile_id: { [Op.in]: ids } } : {},
            attributes: [
                'role',
                [fn('COUNT', col('id')), 'count']
            ],
            group: ['role'],
            order: [[literal('count'), 'DESC']],
            limit: 10,
            raw: true
        });

        res.json({ chart: 'top_job_titles', data });
    } catch (error) {
        console.error('Analytics top-job-titles error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

//7. Top Employers (Bar Chart)
/**
 * @swagger
 * /api/analytics/top-employers:
 *   get:
 *     summary: Top 10 most common employers
 *     tags: [Analytics]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Array of {company, count}
 */
router.get('/top-employers', async (req, res) => {
    try {
        const profileWhere = buildProfileFilter(req.query);
        const profileIds = await Profile.findAll({
            where: profileWhere,
            attributes: ['id'],
            raw: true
        });
        const ids = profileIds.map(p => p.id);

        const data = await Employment.findAll({
            where: ids.length > 0 ? { profile_id: { [Op.in]: ids } } : {},
            attributes: [
                'company',
                [fn('COUNT', col('id')), 'count']
            ],
            group: ['company'],
            order: [[literal('count'), 'DESC']],
            limit: 10,
            raw: true
        });

        res.json({ chart: 'top_employers', data });
    } catch (error) {
        console.error('Analytics top-employers error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

//8. Geographic Distribution (Polar Area Chart)
/**
 * @swagger
 * /api/analytics/geographic:
 *   get:
 *     summary: Alumni count by location
 *     tags: [Analytics]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Array of {location, count}
 */
router.get('/geographic', async (req, res) => {
    try {
        const where = buildProfileFilter(req.query);
        const data = await Profile.findAll({
            where,
            attributes: [
                'location',
                [fn('COUNT', col('id')), 'count']
            ],
            group: ['location'],
            order: [[literal('count'), 'DESC']],
            raw: true
        });

        res.json({ chart: 'geographic_distribution', data });
    } catch (error) {
        console.error('Analytics geographic error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

//9. Browse Alumni
/**
 * @swagger
 * /api/analytics/alumni:
 *   get:
 *     summary: Browse all alumni profiles with filters and pagination
 *     tags: [Analytics]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: programme
 *         schema: { type: string }
 *       - in: query
 *         name: graduation_year
 *         schema: { type: integer }
 *       - in: query
 *         name: sector
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated alumni list with full profile data
 */
router.get('/alumni', async (req, res) => {
    try {
        const where = buildProfileFilter(req.query);
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const offset = (page - 1) * limit;

        const { count, rows } = await Profile.findAndCountAll({
            where,
            include: [
                {
                    model: User,
                    attributes: ['id', 'email']
                },
                { model: Degree },
                { model: Certification },
                { model: Licence },
                { model: ProfessionalCourse },
                { model: Employment },
                { model: Skill }
            ],
            limit,
            offset,
            order: [['graduation_date', 'DESC']],
            distinct: true
        });

        res.json({
            total: count,
            page,
            pages: Math.ceil(count / limit),
            limit,
            alumni: rows
        });
    } catch (error) {
        console.error('Analytics alumni browse error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

//10. Filter options
/**
 * @swagger
 * /api/analytics/filters:
 *   get:
 *     summary: Get available filter values for dropdowns
 *     tags: [Analytics]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Distinct programmes, sectors, and graduation years
 */
router.get('/filters', async (req, res) => {
    try {
        const programmes = await Profile.findAll({
            attributes: [[fn('DISTINCT', col('programme')), 'programme']],
            where: { programme: { [Op.ne]: null } },
            raw: true
        });

        const sectors = await Profile.findAll({
            attributes: [[fn('DISTINCT', col('industry_sector')), 'sector']],
            where: { industry_sector: { [Op.ne]: null } },
            raw: true
        });

        const years = await Profile.findAll({
            attributes: [[fn('DISTINCT', fn('YEAR', col('graduation_date'))), 'year']],
            where: { graduation_date: { [Op.ne]: null } },
            order: [[fn('YEAR', col('graduation_date')), 'ASC']],
            raw: true
        });

        res.json({
            programmes: programmes.map(p => p.programme).filter(Boolean),
            sectors: sectors.map(s => s.sector).filter(Boolean),
            graduation_years: years.map(y => y.year).filter(Boolean)
        });
    } catch (error) {
        console.error('Analytics filters error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

module.exports = router;
