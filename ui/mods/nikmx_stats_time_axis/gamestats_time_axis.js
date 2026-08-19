/*
 * Stats Graph Time Axis
 *
 * The gamestats panel plots its graph with flot and leaves the X axis as raw
 * seconds ({ xaxis: { tickDecimals: 0 } }), so a 20 minute game reads "1200".
 * This turns those labels into m:ss (h:mm:ss past an hour) and snaps the ticks
 * onto whole time intervals.
 *
 * gamestats.js has no loadSceneMods() hook, so this ships as a global mod and
 * bails out immediately in every panel that isn't gamestats.
 */

(function () {
    'use strict';

    var isGamestatsPanel = function () {
        var path = String(document.location.pathname || '');
        return path.indexOf('/gamestats/') !== -1 || path.indexOf('gamestats.html') !== -1;
    };

    if (!isGamestatsPanel())
        return;

    var pad = function (value) {
        return value < 10 ? '0' + value : String(value);
    };

    var formatTime = function (seconds) {
        var negative = seconds < 0;
        var total = Math.round(Math.abs(seconds));
        var hours = Math.floor(total / 3600);
        var minutes = Math.floor((total % 3600) / 60);
        var secs = total % 60;

        var text = hours ? (hours + ':' + pad(minutes) + ':' + pad(secs))
                         : (minutes + ':' + pad(secs));

        return negative ? '-' + text : text;
    };

    /* whole-looking time steps, in seconds */
    var TICK_STEPS = [1, 2, 5, 10, 15, 20, 30, 60, 120, 300, 600, 900, 1200, 1800, 3600, 7200, 10800];
    var TARGET_TICKS = 8;
    var MAX_TICKS = 200;

    var pickStep = function (span) {
        var wanted = span / TARGET_TICKS;
        var i;

        for (i = 0; i < TICK_STEPS.length; ++i) {
            if (TICK_STEPS[i] >= wanted)
                return TICK_STEPS[i];
        }

        return TICK_STEPS[TICK_STEPS.length - 1];
    };

    var timeTicks = function (axis) {
        var min = axis.min;
        var max = axis.max;

        if (!isFinite(min) || !isFinite(max) || max <= min)
            return [min || 0];

        var step = pickStep(max - min);
        var ticks = [];
        var t = Math.ceil(min / step) * step;

        for (; t <= max && ticks.length < MAX_TICKS; t += step)
            ticks.push(t);

        return ticks;
    };

    var installed = false;

    var installPlotHook = function () {
        if (installed || !window.jQuery || typeof jQuery.plot !== 'function')
            return;

        var original = jQuery.plot;

        var patched = function (placeholder, data, options) {
            var opts = jQuery.extend({}, options);

            opts.xaxis = jQuery.extend({}, opts.xaxis, {
                ticks: timeTicks,
                tickFormatter: function (value) { return formatTime(value); }
            });

            return original.call(this, placeholder, data, opts);
        };

        /* flot hangs plugins/helpers off $.plot itself - carry them over */
        jQuery.extend(patched, original);

        jQuery.plot = patched;
        installed = true;
    };

    /* boot.js loads global mods synchronously, before flot's own script tag,
       so wait for document ready to wrap $.plot. */
    if (window.jQuery)
        jQuery(document).ready(installPlotHook);
})();
