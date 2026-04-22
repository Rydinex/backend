const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

let pricingConfig = {
  baseFare: 2.5,
  perMileRate: 1.7,
  perMinuteRate: 0.35,
  averageSpeedMph: 20,
  currency: 'USD',
  platformCommissionRate: 0.2,
};

let surgeConfig = {
  demandRadiusKm: 5,
  sensitivity: 0.7,
  maxMultiplier: 3,
};

const incidentReports = [];

function requireAdmin(req, res, next) {
  return authorize(['admin'])(req, res, next);
}

router.use(authenticate, requireAdmin);

router.get('/drivers', async (req, res) => {
  return res.json([]);
});

router.patch('/drivers/:driverId/review', async (req, res) => {
  const { action } = req.body || {};

  if (!['approve', 'reject'].includes(action)) {
    return res.status(400).json({ message: 'action must be approve or reject.' });
  }

  return res.json({ message: `Driver ${action}d successfully.` });
});

router.get('/trips/monitor', async (req, res) => {
  return res.json({
    count: 0,
    trips: [],
  });
});

router.get('/reports/compliance', async (req, res) => {
  return res.json({
    window: {
      from: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      to: new Date().toISOString(),
    },
    trips: {
      totalTrips: 0,
      completedTrips: 0,
      cancelledTrips: 0,
      activeTrips: 0,
      completionRate: 0,
      cancellationRate: 0,
      completedWithoutReceipt: 0,
    },
    operations: {
      activeDrivers: 0,
      pendingDriverApprovals: 0,
      rejectedDrivers: 0,
      openComplaints: 0,
      resolvedComplaints: 0,
      openSafetyIncidents: 0,
      criticalSafetyIncidents: 0,
      expiringOrExpiredDriverDocuments: 0,
    },
    averages: {
      durationMinutes: 0,
      distanceMiles: 0,
      fare: 0,
    },
    finance: {
      totalPlatformCommission: 0,
    },
  });
});

router.get('/pricing', async (req, res) => {
  return res.json(pricingConfig);
});

router.put('/pricing', async (req, res) => {
  pricingConfig = {
    ...pricingConfig,
    ...(req.body || {}),
  };

  return res.json({
    pricing: pricingConfig,
    message: 'Pricing configuration updated.',
  });
});

router.get('/surge', async (req, res) => {
  return res.json(surgeConfig);
});

router.put('/surge', async (req, res) => {
  surgeConfig = {
    ...surgeConfig,
    ...(req.body || {}),
  };

  return res.json({
    surge: surgeConfig,
    message: 'Surge configuration updated.',
  });
});

router.get('/compliance/reports/compliance/summary', async (req, res) => {
  return res.json({
    window: {
      from: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      to: new Date().toISOString(),
    },
    complaints: {
      totalComplaints: 0,
      openComplaints: 0,
      resolvedComplaints: 0,
    },
    incidents: {
      totalIncidents: incidentReports.length,
      openIncidents: incidentReports.filter(item => item.status !== 'resolved').length,
      criticalIncidents: incidentReports.filter(item => item.severity === 'critical').length,
    },
    logs: {
      tripLogCount: 0,
      driverLogCount: 0,
    },
    documents: {
      upcomingOrExpiredWithin30Days: 0,
    },
  });
});

router.get('/compliance/incidents', async (req, res) => {
  return res.json(incidentReports);
});

router.patch('/compliance/incidents/:incidentId', async (req, res) => {
  const { incidentId } = req.params;
  const { status } = req.body || {};

  const found = incidentReports.find(item => item._id === incidentId);
  if (found) {
    found.status = status || found.status;
    if (status === 'resolved') {
      found.resolvedAt = new Date().toISOString();
    }
    return res.json({ message: 'Incident updated successfully.' });
  }

  return res.status(404).json({ message: 'Incident not found.' });
});

router.get('/compliance/documents/expirations', async (req, res) => {
  const thresholdDays = Number(req.query.thresholdDays || 30);
  return res.json({
    thresholdDays,
    count: 0,
    alerts: [],
  });
});

router.get('/compliance/export', async (req, res) => {
  const dataset = String(req.query.dataset || 'compliance');
  const format = String(req.query.format || 'json').toLowerCase();

  const payload = {
    dataset,
    exportedAt: new Date().toISOString(),
    records: [],
  };

  if (format === 'csv') {
    const header = 'dataset,exportedAt,recordCount';
    const row = `${dataset},${payload.exportedAt},0`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    return res.send(`${header}\n${row}\n`);
  }

  return res.json(payload);
});

module.exports = router;