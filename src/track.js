var defaults = require('./defaults')
var lastfm = require('./lastfm')(defaults.api)
var spotify = require('./spotify')

/**
 * Create track entry.
 * @constructor
 * @param {string} entry - The track to search for.
 * @param {JSON} [response] - Track response object.
 * Should have the property `popularity`.
 * @param {JSON} [responseSimple] - Simplified track response object.
 */
function Track (entry) {
  /**
   * Album name.
   */
  this.albumName = null

  /**
   * Entry string.
   */
  this.entry = entry.trim()

  /**
   * Last.fm user.
   */
  this.lastfmUser = null

  /**
   * Full track object.
   *
   * [Reference](https://developer.spotify.com/web-api/object-model/#track-object-full).
   */
  this.response = null

  /**
   * Simplified track object.
   *
   * [Reference](https://developer.spotify.com/web-api/object-model/#track-object-simplified).
   */
  this.responseSimple = null
}

/**
 * Track album.
 * @return {string} The track album,
 * or the empty string if not available.
 */
Track.prototype.album = function () {
  if (this.albumName) {
    return this.albumName
  } else if (this.response &&
      this.response.album &&
      this.response.album.name) {
    return this.response.album.name
  } else {
    return ''
  }
}

/**
 * Track main artist.
 * @return {string} The main artist.
 */
Track.prototype.artist = function () {
  var response = this.response || this.responseSimple
  if (response &&
      response.artists &&
      response.artists[0] &&
      response.artists[0].name) {
    return response.artists[0].name.trim()
  } else {
    return ''
  }
}

/**
 * Track artists.
 * @return {string} All the track artists, separated by `, `.
 */
Track.prototype.artists = function () {
  var artists = []
  var response = this.response || this.responseSimple
  if (response &&
      response.artists) {
    artists = this.response.artists.map(function (artist) {
      return artist.name.trim()
    })
  }
  return artists.join(', ')
}

/**
 * Disc number.
 * @return {integer} The disc number.
 */
Track.prototype.discNumber = function () {
  var response = this.response || this.responseSimple
  if (response &&
      response.disc_number) {
    return response.disc_number
  } else {
    return -1
  }
}

/**
 * Dispatch entry.
 * @return {Promise | Track} Itself.
 */
Track.prototype.dispatch = function () {
  if (this.response) {
    return Promise.resolve(this)
  } else if (this.responseSimple) {
    return this.fetchTrack()
  } else if (this.isURI(this.entry)) {
    return this.fetchTrack()
  } else if (this.isLink(this.entry)) {
    return this.fetchTrack()
  } else {
    return this.searchForTrack()
  }
}

/**
 * Track duration.
 * @return {integer} The track duration in ms.
 */
Track.prototype.duration = function () {
  var response = this.response || this.responseSimple
  if (response &&
      response.duration_ms) {
    return response.duration_ms
  } else {
    return -1
  }
}

/**
 * Whether this track is equal to another track.
 * @param {Track} track - The track to compare against.
 * @return {boolean} `true` if the tracks are equal,
 * `false` otherwise.
 */
Track.prototype.equals = function (track) {
  var uri1 = this.uri()
  var uri2 = track.uri()
  return uri1 && uri2 && uri1 === uri2
}

/**
 * Fetch Last.fm information.
 * @return {Promise | Track} Itself.
 */
Track.prototype.fetchLastfm = function (user) {
  var artist = this.artist()
  var title = this.title()
  this.lastfmUser = user
  var self = this
  return lastfm.getInfo(artist, title, user).then(function (result) {
    self.lastfmResponse = result
    return self
  })
}

/**
 * Fetch track metadata.
 * @return {Promise | Track} Itself.
 */
Track.prototype.fetchTrack = function () {
  var self = this
  return spotify.getTrack(this.id()).then(function (result) {
    self.response = result
    return self
  })
}

/**
 * Whether the track has the given artist.
 * @param {string} artist - The artist.
 * @return {boolean} `true` the track has the artist,
 * `false` otherwise.
 */
Track.prototype.hasArtist = function (artist) {
  var response = this.response || this.responseSimple
  var artists = response.artists.map(function (artist) {
    return artist.name.trim().toLowerCase()
  })
  artist = artist.trim().toLowerCase()
  for (var i in artists) {
    if (artists[i].includes(artist)) {
      return true
    }
  }
  return false
}

/**
 * Spotify ID.
 * @return {string} The Spotify ID of the track,
 * or `-1` if not available.
 */
Track.prototype.id = function () {
  if (this.response &&
      this.response.id) {
    return this.response.id
  } else if (this.responseSimple &&
             this.responseSimple.id) {
    return this.responseSimple.id
  } else if (this.isURI(this.entry)) {
    return this.entry.substring(14)
  } else if (this.isLink(this.entry)) {
    return this.entry.split('/')[4]
  } else {
    return -1
  }
}

/**
 * Whether a string is a Spotify link
 * on the form `http://open.spotify.com/track/ID`.
 * @param {string} str - A potential Spotify link.
 * @return {boolean} `true` if `str` is a link, `false` otherwise.
 */
Track.prototype.isLink = function (str) {
  return str.match(/^https?:\/\/open\.spotify\.com\/track\//i)
}

/**
 * Whether a string is a Spotify URI
 * on the form `spotify:track:xxxxxxxxxxxxxxxxxxxxxx`.
 * @return {boolean} `true`
 * or `-1` if not available.
 */
Track.prototype.isURI = function (str) {
  return str.match(/^spotify:track:/i)
}

/**
 * Last.fm global playcount.
 * @return {integer} The global playcount, or `-1` if not available.
 */
Track.prototype.lastfm = function () {
  var personal = this.lastfmPersonal()
  return personal > -1 ? personal : this.lastfmGlobal()
}

/**
 * Last.fm global playcount.
 * @return {integer} The global playcount, or `-1` if not available.
 */
Track.prototype.lastfmGlobal = function () {
  if (this.lastfmResponse &&
      this.lastfmResponse.track &&
      this.lastfmResponse.track.playcount) {
    return parseInt(this.lastfmResponse.track.playcount)
  } else {
    return -1
  }
}

/**
 * Last.fm personal playcount.
 * @return {integer} The personal playcount, or `-1` if not available.
 */
Track.prototype.lastfmPersonal = function () {
  if (this.lastfmResponse &&
      this.lastfmResponse.track &&
      this.lastfmResponse.track.userplaycount) {
    return parseInt(this.lastfmResponse.track.userplaycount)
  } else {
    return -1
  }
}

/**
 * Full track name.
 * @return {string} The track name, on the form `Title - Artist`.
 */
Track.prototype.name = function () {
  var title = this.title()
  if (title) {
    var artist = this.artist()
    if (artist) {
      return title + ' - ' + artist
    } else {
      return title
    }
  } else {
    return ''
  }
}

/**
 * Spotify popularity.
 * @return {int} The Spotify popularity, or `-1` if not available.
 */
Track.prototype.popularity = function () {
  if (this.response) {
    return this.response.popularity
  } else if (this.responseSimple &&
             this.responseSimple.popularity) {
    return this.responseSimple.popularity
  } else {
    return -1
  }
}

/**
 * Spotify popularity as a promise.
 * @return {Promise | int} The Spotify popularity, or `-1` if not available.
 */
Track.prototype.popularityPromise = function () {
  return this.refresh().then(function () {
    return Promise.resolve(this.popularity())
  })
}

/**
 * Refresh track metadata.
 * @return {Promise | Track} Itself.
 */
Track.prototype.refresh = function () {
  var self = this
  return self.dispatch().then(function () {
    return self.dispatch()
  })
}

/**
 * Search for track.
 * @param {string} query - The query text.
 * @return {Promise | Track} Itself.
 */
Track.prototype.searchForTrack = function () {
  var self = this
  return spotify.searchForTrack(this.entry).then(function (result) {
    self.response = result.tracks.items[0]
    return self
  })
}

/**
 * Set album for track.
 * @param {string} album - The album name.
 */
Track.prototype.setAlbum = function (album) {
  this.albumName = album
}

/**
 * Whether this track is similar to another track.
 * @param {Track} track - The track to compare against.
 * @return {boolean} `true` if the tracks are similar,
 * `false` otherwise.
 */
Track.prototype.similarTo = function (track) {
  if (this.equals(track)) {
    return true
  } else {
    var str1 = this.toString().toLowerCase()
    var str2 = track.toString().toLowerCase()
    return str1 === str2
  }
}

/**
 * Track title.
 * @return {string} The track title.
 */
Track.prototype.title = function () {
  var response = this.response || this.responseSimple
  if (response &&
      response.name) {
    return response.name
  } else {
    return ''
  }
}

/**
 * Track number.
 * @return {integer} The track number.
 */
Track.prototype.trackNumber = function () {
  var response = this.response || this.responseSimple
  if (response &&
      response.track_number) {
    return response.track_number
  } else {
    return -1
  }
}

/**
 * Full track title.
 * @return {string} The track title, on the form `Title - Artist`.
 */
Track.prototype.toString = function () {
  var name = this.name()
  if (name) {
    return name
  } else {
    return this.entry
  }
}

/**
 * Spotify URI.
 * @return {string} The Spotify URI
 * (a string on the form `spotify:track:xxxxxxxxxxxxxxxxxxxxxx`),
 * or the empty string if not available.
 */
Track.prototype.uri = function () {
  if (this.response) {
    return this.response.uri
  } else if (this.responseSimple) {
    return this.responseSimple.uri
  } else {
    return ''
  }
}

/**
 * Set the JSON response.
 * @param {JSON} response - The response.
 */
Track.prototype.setResponse = function (response) {
  if (response &&
      response.popularity) {
    this.response = response
  } else {
    this.responseSimple = response
  }
}

module.exports = Track
