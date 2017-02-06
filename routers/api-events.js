var checksCtrlr = require("bolt-internal-checks");

var express = require('express');

var apiEventsCtrlr = require('../controllers/api-events');

var router = express.Router();

router.post('/:name', checksCtrlr.getAppName, apiEventsCtrlr.postEvent);
//router.post('/pub', apiEventsCtrlr.postPub);
//router.post('/sub', apiEventsCtrlr.postSub);
//router.post('/unsub', apiEventsCtrlr.postUnsub);

module.exports = router;