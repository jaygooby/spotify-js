var stringify = require('csv-stringify/lib/sync')

/**
 * Create CSV formatter.
 * @constructor
 * @param {track} track - A track with fetched metadata.
 */
function CSV (track) {
  /**
   * A track with fetched metadata.
   */
  this.track = track
}

/**
 * Track data in CSV format, with the following fields:
 *
 * Spotify URI,
 * Track Name,
 * Artist Name,
 * Album Name,
 * Disc Number,
 * Track Number,
 * Track Duration,
 * Added By,
 * Added At
 *
 * @return {string} Track data in CSV format.
 */
CSV.prototype.toString = function () {
  function numberToString (num) {
    return (num < 0) ? '' : num
  }
  return stringify([[
    this.track.uri(),
    this.track.title(),
    this.track.artist(),
    this.track.album(),
    numberToString(this.track.discNumber()),
    numberToString(this.track.trackNumber()),
    numberToString(this.track.duration()),
    numberToString(this.track.popularity()),
    numberToString(this.track.lastfm())
  ]]).trim()
}

module.exports = CSV
