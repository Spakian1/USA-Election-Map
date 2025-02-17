var currentMapType = mapTypes[mapTypeIDs[0]]

var mapSources = currentMapType.getMapSources()
var mapSourceIDs = currentMapType.getMapSourceIDs()
var currentCustomMapSource = currentMapType.getCustomMapSource()

var mapRegionNameToID = currentMapType.getRegionNameToID()

var currentMapSource = NullMapSource

var currentDisplayDate
var displayMapQueue = []
var isRunningDisplayMapQueue = false

var selectedParty

var defaultMarginValues = {safe: 15, likely: 5, lean: 1, tilt: Number.MIN_VALUE}
var marginValues = JSON.parse(getCookie(marginsCookieName)) || cloneObject(defaultMarginValues)
var marginNames = {safe: "Safe", likely: "Likely", lean: "Lean", tilt: "Tilt"}

const defaultRegionFillColor = TossupParty.getMarginColors().safe
const regionFillAnimationDuration = 0.1
const regionStrokeAnimationDuration = 0.06

const regionSelectColor = "#ffffff"
const regionDeselectColor = "#181922" //#555

const regionDisabledColor = "#28292F"

const flipPatternBrightnessFactor = 0.8
const flipPatternHeight = 5
const flipPatternWidth = 5

const linkedRegions = [["MD", "MD-button"], ["DE", "DE-button"], ["NJ", "NJ-button"], ["CT", "CT-button"], ["RI", "RI-button"], ["MA", "MA-button"], ["VT", "VT-button"], ["NH", "NH-button"], ["HI", "HI-button"], ["ME-AL", "ME-AL-land"], ["ME-D1", "ME-D1-land"], ["ME-D2", "ME-D2-land"], ["NE-AL", "NE-AL-land"], ["NE-D1", "NE-D1-land"], ["NE-D2", "NE-D2-land"], ["NE-D3", "NE-D3-land"]]

const noInteractSVGRegionAttribute = "data-nointeract"
const noCountSVGRegionAttribute = "data-nocount"
const isDistrictBoxRegionAttribute = "data-isdistrictbox"

const nationalPopularVoteID = "NPV"

var displayRegionDataArray = {}
var regionIDsToIgnore = [/.+-button/, /.+-land/]

var showingDataMap = false

var editingRegionEVs = false
var overrideRegionEVs = {}

var editingRegionMarginValue = false

var ignoreMapUpdateClickArray = []

var currentSliderDate
const initialKeyPressDelay = 500
const zoomKeyPressDelayForHalf = 3000
const maxDateSliderTicks = 55

const ViewingState = {
  viewing: 0,
  zooming: 1
}
var currentViewingState = ViewingState.viewing

const EditingState = {
  viewing: 2,
  editing: 3
}
var currentEditingState = EditingState.viewing

var currentMapZoomRegion = null

var showingHelpBox = false

var showingCompareMap = false
var compareMapSourceIDArray = [null, null]
var compareMapDataArray = [null, null]
var selectedCompareSlider = null

var selectedDropdownDivID = null

$(async function() {
  currentMapType = mapTypes[getCookie("currentMapType") || mapTypeIDs[0]] || mapTypes[mapTypeIDs[0]]
  $("#cycleMapTypeButton").find("img").attr('src', currentMapType.getIconURL())

  reloadForNewMapType(true)

  preloadAssets([
    "assets/icon-download-none.png",
    "assets/icon-download.png",
    "assets/icon-loading.png",
    "assets/icon-download-complete.png",

    "assets/fivethirtyeight-large.png",
    "assets/jhk-large.png",
    "assets/cookpolitical-large.png",
    "assets/wikipedia-large.png",
    "assets/lte-large.png",
    "assets/pa-large.png"
  ])

  createMarginEditDropdownItems()
  createCountdownDropdownItems()
  createPartyDropdowns()

  addDivEventListeners()

  addTextBoxSpacingCSS()

  updateCountdownTimer()
  setTimeout(function() {
    setInterval(function() {
      updateCountdownTimer()
    }, 1000)
  }, 1000-((new Date()).getTime()%1000))

  $.ajaxSetup({cache: false})
})

async function reloadForNewMapType(initialLoad)
{
  var previousDateOverride
  if (!initialLoad)
  {
    previousDateOverride = currentSliderDate ? currentSliderDate.getTime() : null
    clearMap(true, false)
  }

  mapSources = currentMapType.getMapSources()
  mapSourceIDs = currentMapType.getMapSourceIDs()
  currentCustomMapSource = currentMapType.getCustomMapSource()
  mapRegionNameToID = currentMapType.getRegionNameToID()

  if (currentMapType.getCustomMapEnabled())
  {
    $("#editDoneButton").removeClass('topnavdisable2')
  }
  else
  {
    $("#editDoneButton").addClass('topnavdisable2')
  }

  if (currentMapType.getCompareMapEnabled())
  {
    $("#compareButton").removeClass('topnavdisable2')
    $("#compareDropdownContent").removeClass('topnavdisable2')
    $("#compareDropdownContent").css("opacity", "100%")
  }
  else
  {
    $("#compareButton").addClass('topnavdisable2')
    $("#compareDropdownContent").addClass('topnavdisable2')
    $("#compareDropdownContent").css("opacity", "0%")
  }

  selectedParty = null
  displayRegionDataArray = {}
  regionIDsToIgnore = [/.+-button/, /.+-land/]
  showingDataMap = false
  ignoreMapUpdateClickArray = []
  currentSliderDate = null
  currentEditingState = EditingState.viewing
  currentViewingState = ViewingState.viewing
  currentMapZoomRegion = null
  showingCompareMap = false
  compareMapSourceIDArray = [null, null]
  compareMapDataArray = [null, null]
  selectedCompareSlider = null

  createMapTypeDropdownItems()
  createMapSourceDropdownItems()
  createSettingsDropdownItems()
  createComparePresetDropdownItems()

  currentMapSource = (currentMapType.getCurrentMapSourceID() && currentMapType.getCurrentMapSourceID() in mapSources && !(!currentMapType.getCustomMapEnabled() && currentMapType.getCurrentMapSourceID() == currentMapType.getCustomMapSource().getID())) ? mapSources[currentMapType.getCurrentMapSourceID()] : NullMapSource
  if (currentMapSource.getID() == NullMapSource.getID())
  {
    $("#sourceToggleButton").addClass('active')
  }

  await loadMapSVGFile()

  $("#totalsPieChartContainer").html("<canvas id='totalsPieChart'></canvas>")
  $("#helpbox").html(currentMapType.getControlsHelpHTML())

  $("#loader").hide()
  resizeElements(false)

  populateRegionsArray()
  for (var partyNum in dropdownPoliticalPartyIDs)
  {
    if (dropdownPoliticalPartyIDs[partyNum] == TossupParty.getID()) { continue }
    politicalParties[dropdownPoliticalPartyIDs[partyNum]].setCandidateName(politicalParties[dropdownPoliticalPartyIDs[partyNum]].getNames()[0])
  }
  displayPartyTotals(getPartyTotals())

  setupTotalsPieChart()
  updateTotalsPieChart()

  updateIconsBasedOnLocalCSVData()

  if (currentMapSource.getID() != NullMapSource.getID())
  {
    updateNavBarForNewSource()
    loadDataMap(false, false, previousDateOverride)
  }
  else
  {
    updateNavBarForNewSource(true)
  }
}

function loadMapSVGFile(handleNewSVG)
{
  var loadSVGFilePromise = new Promise((resolve) => {
    $("#svgdata").css('opacity', "0")
    $("#mapCloseButton").hide()

    handleNewSVG = handleNewSVG || async function(resolve, svgPath) {
      $("#mapzoom").empty()
      $("#mapzoom-preload").children().appendTo($("#mapzoom"))

      if (svgPath instanceof Array)
      {
        await handleSVGZooming(resolve, svgPath, handleNewSVGFields)
      }
      else
      {
        handleNewSVGFields(resolve)
      }
    }

    currentMapType.loadSVG((svgPath) => {
      handleNewSVG(resolve, svgPath)
    })
  })

  return loadSVGFilePromise
}

function handleNewSVGFields(resolve)
{
  $("#svgdata").css('opacity', "1")

  setOutlineDivProperties()
  updateMapElectoralVoteText()

  if (currentMapType.getMapSettingValue("flipStates"))
  {
    generateFlipPatternsFromPartyMap(politicalParties)
  }

  resolve()
}

async function handleSVGZooming(resolve, svgPath, handleNewSVG)
{
  var handleSVGZoomingPromise = new Promise((innerResolve) => {
    var stateToShow = svgPath[1]
    if (stateToShow != null)
    {
      for (let districtPath of $("#outlines")[0].querySelectorAll("*"))
      {
        var splitArray = districtPath.id.split("-")
        if ((stateToShow != splitArray[0] && splitArray[0] != "use") || splitArray[1] == "button")
        {
          districtPath.remove()
        }
      }

      $("#text").remove()
    }

    $("#mapCloseButton").show()

    setTimeout(() => {
      var svgDataBoundingBox = $("#svgdata")[0].getBBox()
      $("#outlines").css("stroke-width", (Math.max(svgDataBoundingBox.width/$("#svgdata").width(), svgDataBoundingBox.height/$("#svgdata").height())*1) + "px")
      $("#svgdata")[0].setAttribute('viewBox', (svgDataBoundingBox.x) + " " + (svgDataBoundingBox.y) + " " + (svgDataBoundingBox.width) + " " + (svgDataBoundingBox.height))

      handleNewSVG(() => {
        innerResolve()
        resolve()
      }, svgPath)
    }, 0)
  })

  return handleSVGZoomingPromise
}

function setOutlineDivProperties()
{
  $('#outlines').children().each(function() {
    var outlineDiv = $(this)

    outlineDiv.css('cursor', "pointer")

    outlineDiv.css('transition', "fill " + regionFillAnimationDuration + "s linear, stroke " + regionStrokeAnimationDuration + "s linear")
    outlineDiv.css('fill', defaultRegionFillColor)

    outlineDiv.attr('onmouseenter', "mouseEnteredRegion(this)")
    outlineDiv.attr('onmouseleave', "mouseLeftRegion(this)")

    outlineDiv.on('click', function(e) {
      if (e.altKey)
      {
        altClickRegion(e.target)
      }
      else if (e.shiftKey)
      {
        shiftClickRegion(e.target)
      }
      else if (e.which == 3 || e.ctrlKey)
      {
        return // handled in contextmenu
      }
      else
      {
        leftClickRegion(e.target)
      }
    })

    outlineDiv.on('contextmenu', function(e) {
      rightClickRegion(e.target)
    })
  })
}

function resizeElements(initilizedPieChart)
{
  var windowWidth = $(window).width()

  //1.0*svgdatawidth*zoom/windowwidth == 0.6
  const defaultMapZoom = 120.634/100
  var mapZoom = 0.62*windowWidth/$("#svgdata").width()
  var topnavZoom = 0.85*mapZoom
  if (navigator.userAgent.indexOf("Firefox") != -1)
  {
    $("#mapzoom").css("transform", "scale(" + mapZoom + ")")
    $("#mapzoom").css("transform-origin", "0 0")
  }
  else
  {
    $("#mapzoom").css("zoom", (mapZoom*100) + "%")
    $("#helpbox").css("zoom", (mapZoom*100/defaultMapZoom) + "%")

    $(".topnav").css("zoom", (topnavZoom*100) + "%")
  }

  var mapWidth = $("#svgdata").width()*mapZoom
  var originalMapHeight = $("#svgdata").height()

  $(".slider").width(mapWidth-190)

  setSliderTickMarginShift("dataMapDateSliderContainer", "dataMapDateSlider", "dataMapSliderStepList")
  setSliderDateDisplayMarginShift("dateDisplay", "sliderDateDisplayContainer", "dataMapDateSlider", originalMapHeight, mapZoom)

  setSliderTickMarginShift("firstCompareSliderDateDisplayContainer", "firstCompareDataMapDateSlider", "firstCompareDataMapSliderStepList")
  setSliderDateDisplayMarginShift("firstCompareDateDisplay", "firstCompareSliderDateDisplayContainer", "firstCompareDataMapDateSlider", originalMapHeight, mapZoom)
  setSliderTickMarginShift("secondCompareSliderDateDisplayContainer", "secondCompareDataMapDateSlider", "secondCompareDataMapSliderStepList")
  setSliderDateDisplayMarginShift("secondCompareDateDisplay", "secondCompareSliderDateDisplayContainer", "secondCompareDataMapDateSlider", originalMapHeight, mapZoom)

  if (navigator.userAgent.indexOf("Firefox") != -1)
  {
    $("#totalsPieChart").width(windowWidth-windowWidth*0.15-mapWidth)
    $("#totalsPieChart").height(windowWidth-windowWidth*0.09-mapWidth)
  }
  else
  {
    $("#totalsPieChart").width(windowWidth-windowWidth*0.12-mapWidth)
    $("#totalsPieChart").height(windowWidth-windowWidth*0.09-mapWidth)
  }
  $("#totalsPieChart").css("background-size", $("#totalsPieChart").width()*totalsPieChartCutoutPercent/100.0*0.5)
  $("#totalsPieChart").css("background-position", "center")
  $("#totalsPieChart").css("background-repeat", "no-repeat")

  $("#helpboxcontainer").css('width', $("#totalsPieChart").width())
  $("#partyDropdownsBoxContainer").css('width', $("#totalsPieChart").width())
  $("#partyDropdownsFlexbox").css('min-height', (110*mapZoom/defaultMapZoom))

  $("#discordInvite").css("width", $("#totalsPieChart").width())
  $("#discordInvite").css("border-radius", "5px")
  $("#discordInvite").css("border", "1px solid gray")

  if (initilizedPieChart == true || initilizedPieChart == null)
  {
    updateTotalsPieChart()
  }
}

function setSliderTickMarginShift(sliderContainerDivID, sliderDivID, sliderTicksDivID)
{
  var shouldHideSlider = $("#" + sliderContainerDivID).is(":hidden")
  if (shouldHideSlider)
  {
    $("#" + sliderContainerDivID).show()
  }
  var marginShift = $("#" + sliderTicksDivID)[0].getBoundingClientRect().y-$("#" + sliderDivID)[0].getBoundingClientRect().y
  if (marginShift != 0)
  {
    $("#" + sliderTicksDivID).css("margin-top", "-" + marginShift + "px")
  }
  if (shouldHideSlider)
  {
    $("#" + sliderContainerDivID).hide()
  }
}

function setSliderDateDisplayMarginShift(dateDisplayDivID, sliderContainerDivID, sliderDivID, originalMapHeight, mapZoom)
{
  if (navigator.userAgent.indexOf("Firefox") != -1)
  {
    $("#" + dateDisplayDivID).css("transform", "scale(" + ($(window).width()*0.10/$("#" + dateDisplayDivID).width()) + ")")
    $("#" + dateDisplayDivID).css("transform-origin", "0 50%")
    $("#" + sliderContainerDivID).css("top", originalMapHeight*(mapZoom-1))
  }
  else
  {
    $("#" + dateDisplayDivID).css("zoom", (100*($(window).width()-1800)/6000+100) + "%")
  }

  $("#" + dateDisplayDivID).css("margin-top", ($("#" + sliderDivID).height()/4-1))
}

function preloadAssets(assetURLs)
{
  for (var urlNum in assetURLs)
  {
    (new Image()).src = assetURLs[urlNum]
  }
}

function addDivEventListeners()
{
  document.getElementById("clearMapButton").addEventListener('click', function(e) {
    clearMap()

    if (e.altKey)
    {
      for (var mapSourceID in mapSources)
      {
        mapSources[mapSourceID].resetMapData()
        removeStatusImage(mapSourceID.replace(/\s/g, '') + "-icon")
        insertStatusImage(mapSourceID.replace(/\s/g, '') + "-icon", "./assets/icon-download-none.png", 24, 24, -1)
      }
    }
  })

  document.getElementById("sourceToggleButton").addEventListener('click', function(e) {
    if (currentEditingState == EditingState.editing) { return }
    if (!e.altKey)
    {
      toggleMapSource(this)
    }
    else
    {
      downloadAllMapData()
    }
  })

  $("#uploadFileInput").change(function() {
    if (!this.files || this.files.length == 0) { return }
    loadUploadedFile(this.files[0])
  })

  document.getElementById("marginEditButton").addEventListener('click', function(e) {
    toggleMarginEditing()

    if (e.altKey)
    {
      marginValues = cloneObject(defaultMarginValues)
      createMarginEditDropdownItems()

      if (showingDataMap)
      {
        displayDataMap()
      }
    }
  })

  $("#regionboxcontainer").on('show', function() {
    $(this).show()
    $(this).css('opacity', "1")
  })

  $("#regionboxcontainer").on('hide', function() {
    $(this).css('opacity', "0")

    setTimeout(function() {
      if ($("#regionboxcontainer").css('opacity') == "0" && !currentRegionID) { $("#regionboxcontainer").hide() }
    }, 200)
  })

  $("#mapCloseButton").hover(function() {
    $("#mapCloseButtonImage").attr('src', "./assets/close-icon-hover.png")
  }, function() {
    $("#mapCloseButtonImage").attr('src', "./assets/close-icon.png")
  })

  createPartyDropdownsBoxHoverHandler()
}

function addTextBoxSpacingCSS()
{
  switch (browserName)
  {
    case "Chrome":
    $(".textbox").css('letter-spacing', "1px")
    break

    case "Firefox":
    $(".textbox").css('letter-spacing', "0.8px")
    break
  }
}

function loadDataMap(shouldSetToMax, forceDownload, previousDateOverride, resetCandidateNames)
{
  var loadDataMapPromise = new Promise(async (resolve) => {
    $("#dataMapDateSliderContainer").hide()
    $("#dateDisplay").hide()

    if (selectedDropdownDivID != "mapSourcesDropdownContent")
    {
      $("#sourceToggleButton").removeClass('active')
    }

    if (editMarginID)
    {
      toggleMarginEditing(editMarginID)
    }
    if (editCandidateNamePartyID)
    {
      toggleCandidateNameEditing(editCandidateNamePartyID, null, true)
    }
    if (editPartyMarginColor)
    {
      toggleMarginHexColorEditing()
    }
    editingRegionEVs = false
    editingRegionMarginValue = false

    currentMapType.setCurrentMapSourceID(currentMapSource.getID())

    var iconDivDictionary = getIconDivsToUpdateArrayForSourceID(currentMapSource.getID())
    var loadedSuccessfully = await downloadDataForMapSource(currentMapSource.getID(), iconDivDictionary, null, forceDownload, null, null, resetCandidateNames)

    if (!loadedSuccessfully) { resolve(); return }

    shouldSetToMax = currentMapType.getMapSettingValue("startAtLatest") ? true : shouldSetToMax

    setDataMapDateSliderRange(shouldSetToMax, null, null, null, previousDateOverride)
    await displayDataMap(null, true)
    $("#dataMapDateSliderContainer").show()
    $("#dateDisplay").show()

    $("#totalsPieChart").attr('onclick', "!currentMapZoomRegion ? currentMapSource.openHomepageLink(currentSliderDate) : currentMapSource.openRegionLink(currentMapZoomRegion, currentSliderDate)")

    if (currentMapSource.getIconURL() != null && currentMapSource.getIconURL() != "none")
    {
      $("#totalsPieChart").css("background-image", "url(" + currentMapSource.getIconURL() + ")")
    }
    else
    {
      $("#totalsPieChart").css("background-image", "")
    }

    resolve()
  })

  return loadDataMapPromise
}

function setDataMapDateSliderRange(shouldSetToMax, sliderDivID, sliderTickDivID, mapDates, previousDate)
{
  shouldSetToMax = shouldSetToMax == null ? false : shouldSetToMax
  sliderDivID = sliderDivID || "dataMapDateSlider"
  sliderTickDivID = sliderTickDivID || "dataMapSliderStepList"
  mapDates = mapDates || currentMapSource.getMapDates()
  previousDate = previousDate || (currentSliderDate ? currentSliderDate.getTime() : null)

  var endDate = new Date(mapDates[mapDates.length-1])

  var latestSliderTickEnabled = currentMapType.getMapSettingValue("latestTick")
  var previousValueWasLatest = $("#" + sliderDivID).val() != null && $("#" + sliderDivID).val() == $("#" + sliderDivID).attr('max') && latestSliderTickEnabled

  $("#" + sliderDivID).attr('max', mapDates.length+(latestSliderTickEnabled ? 1 : 0))

  if ((currentSliderDate == null && previousDate == null) || shouldSetToMax || previousValueWasLatest)
  {
    $("#" + sliderDivID).val(mapDates.length+(latestSliderTickEnabled ? 1 : 0))
    currentSliderDate = endDate
  }
  else
  {
    var closestDate = mapDates[0]
    var closestDateIndex = 0
    for (let dateNum in mapDates)
    {
      if (Math.abs(previousDate-mapDates[dateNum]) < Math.abs(closestDate-previousDate))
      {
        closestDate = mapDates[dateNum]
        closestDateIndex = dateNum
      }
    }

    $("#" + sliderDivID).val(parseInt(closestDateIndex)+1)
    currentSliderDate = new Date(closestDate)
  }

  $("#" + sliderTickDivID).empty()
  if (mapDates.length <= maxDateSliderTicks)
  {
    for (let _ in mapDates)
    {
      $("#" + sliderTickDivID).append("<span class='tick'></span>")
    }
    if (latestSliderTickEnabled)
    {
      $("#" + sliderTickDivID).append("<span class='tick'></span>")
    }
  }
}

function updateSliderDateDisplay(dateToDisplay, overrideDateString, sliderDateDisplayDivID)
{
  sliderDateDisplayDivID = sliderDateDisplayDivID || "dateDisplay"

  var dateString
  if (overrideDateString != null)
  {
    dateString = overrideDateString
  }
  else
  {
    dateString = getDateString(dateToDisplay, "/", false, true)
  }

  $("#" + sliderDateDisplayDivID).html(dateString)
  currentSliderDate = dateToDisplay
}

async function executeDisplayMapQueue()
{
  if (isRunningDisplayMapQueue) { return }

  isRunningDisplayMapQueue = true

  while (displayMapQueue.length > 0)
  {
    await displayDataMap(displayMapQueue[0][0], displayMapQueue[0][1])
    displayMapQueue.splice(-1, 1)
  }

  isRunningDisplayMapQueue = false
}

async function displayDataMap(dateIndex, reloadPartyDropdowns)
{
  dateIndex = dateIndex || $("#dataMapDateSlider").val()

  var mapDates = currentMapSource.getMapDates()
  var dateToDisplay = new Date(mapDates[dateIndex-1])

  currentDisplayDate = dateToDisplay

  updateSliderDateDisplay(dateToDisplay)

  var shouldReloadSVG = false
  var currentSVGPath = currentMapType.getSVGPath()
  var newOverrideSVGPath = currentMapSource.getOverrideSVGPath(!showingCompareMap ? dateToDisplay : currentSliderDate)

  if (newOverrideSVGPath != null && JSON.stringify(currentSVGPath) != JSON.stringify(newOverrideSVGPath))
  {
    currentMapType.setOverrideSVGPath(newOverrideSVGPath)
    shouldReloadSVG = true
  }
  else if (newOverrideSVGPath == null && currentSVGPath != null)
  {
    shouldReloadSVG = currentMapType.resetOverrideSVGPath()
  }

  var cachedSVGPathData
  if (shouldReloadSVG)
  {
    await loadMapSVGFile((resolve, svgPath) => {
      cachedSVGPathData = svgPath
      resolve()
    })
  }
  var svgPathData = currentMapType.getSVGPath()
  var usedFallbackMap = svgPathData[2] || false
  var populateSVGBoxesFunction = svgPathData[3]

  var currentMapDataForDate = currentMapSource.getMapData()[dateToDisplay.getTime()]

  switch (currentViewingState)
  {
    case ViewingState.viewing:
    currentMapDataForDate = await currentMapSource.getViewingData(currentMapDataForDate)
    break

    case ViewingState.zooming:
    currentMapDataForDate = await currentMapSource.getZoomingData(currentMapDataForDate, currentMapZoomRegion)
    break
  }

  if (currentDisplayDate.getTime() != dateToDisplay.getTime())
  {
    console.log(currentDisplayDate.getFullYear(), dateToDisplay.getFullYear())

    $("#svgdata").css('opacity', "1")
    $("#mapzoom-preload").empty()

    return
  }
  else if (shouldReloadSVG)
  {
    $("#mapzoom").empty()
    $("#mapzoom-preload").children().appendTo($("#mapzoom"))

    if (cachedSVGPathData instanceof Array)
    {
      await handleSVGZooming(() => {}, cachedSVGPathData, handleNewSVGFields)
    }
    else
    {
      handleNewSVGFields(() => {})
    }
  }

  if (currentViewingState == ViewingState.zooming && usedFallbackMap)
  {
    populateSVGBoxesFunction(currentMapDataForDate)
    setOutlineDivProperties()
  }

  displayRegionDataArray = {}
  populateRegionsArray()

  $('#outlines').children().each(function() {
    var regionDataCallback = getRegionData($(this).attr('id'))
    var regionIDsToFill = regionDataCallback.linkedRegionIDs
    var regionData = regionDataCallback.regionData

    updateRegionFillColors(regionIDsToFill, regionData, false)
  })

  for (let regionNum in currentMapDataForDate)
  {
    var regionDataCallback = getRegionData(currentMapDataForDate[regionNum].region)
    var regionData = regionDataCallback.regionData
    var regionsToFill = regionDataCallback.linkedRegionIDs

    if (regionData == null)
    {
      displayRegionDataArray[regionNum] = {}
      regionData = displayRegionDataArray[regionNum]
    }

    regionData.region = currentMapDataForDate[regionNum].region
    regionData.margin = currentMapDataForDate[regionNum].margin
    regionData.partyID = currentMapDataForDate[regionNum].partyID
    regionData.disabled = currentMapDataForDate[regionNum].disabled
    regionData.candidateName = currentMapDataForDate[regionNum].candidateName
    regionData.candidateMap = currentMapDataForDate[regionNum].candidateMap
    regionData.chanceIncumbent = currentMapDataForDate[regionNum].chanceIncumbent
    regionData.chanceChallenger = currentMapDataForDate[regionNum].chanceChallenger
    regionData.partyVotesharePercentages = currentMapDataForDate[regionNum].partyVotesharePercentages
    regionData.seatClass = currentMapDataForDate[regionNum].seatClass
    regionData.flip = currentMapDataForDate[regionNum].flip
    regionData.partyVoteSplits = currentMapDataForDate[regionNum].partyVoteSplits

    updateRegionFillColors(regionsToFill, regionData, false)
  }

  updatePoliticalPartyCandidateNames(dateToDisplay.getTime())
  displayPartyTotals(getPartyTotals(), reloadPartyDropdowns)

  updateTotalsPieChart()

  updateMapElectoralVoteText()

  if (currentRegionID && currentEditingState == EditingState.viewing)
  {
    updateRegionBox(currentRegionID)
  }

  showingDataMap = true
}

function updateMapElectoralVoteText()
{
  if (!currentMapType.getShouldDisplayEVOnMap()) { return }

  var regionIDs = Object.values(mapRegionNameToID)
  for (var regionNum in regionIDs)
  {
    var regionChildren = $("#" + regionIDs[regionNum] + "-text").children()

    var regionEV = currentMapType.getEV(getCurrentDecade(), regionIDs[regionNum], (displayRegionDataArray[regionIDs[regionNum]] || {}))
    if (regionEV == undefined) { continue }

    if (regionChildren.length == 1)
    {
      regionChildren[0].innerHTML = regionIDs[regionNum] + " " + regionEV
    }
    else if (regionChildren.length == 2)
    {
      regionChildren[1].innerHTML = regionEV
    }
  }
}

function updateNavBarForNewSource(revertToDefault)
{
  revertToDefault = revertToDefault == null ? false : revertToDefault
  $("#mapSourcesDropdownContainer .active").removeClass("active")
  if (revertToDefault)
  {
    $("#sourceToggleButton").html("Select Source")
  }
  else
  {
    $("#sourceToggleButton").html("Source: " + currentMapSource.getName())
    $("#" + currentMapSource.getID().replace(/\s/g, '')).addClass("active")
  }

  if (currentEditingState == EditingState.editing && currentMapSource.isCustom())
  {
    $("#editDoneButton").html("Done")
  }
  else if (currentEditingState == EditingState.editing && currentMapSource.getID() != currentCustomMapSource.getID())
  {
    toggleEditing(EditingState.viewing)
  }
  else if (currentEditingState != EditingState.editing && currentMapSource.isCustom())
  {
    $("#editDoneButton").html("Edit")
  }
  else
  {
    $("#editDoneButton").html("Copy")
  }

  updatePartyDropdownVisibility()

  if (showingCompareMap && currentMapSource.getID() != currentCustomMapSource.getID())
  {
    updateCompareMapSlidersVisibility(false)
  }
  else if (showingCompareMap && currentMapSource.isCustom())
  {
    updateCompareMapSlidersVisibility(true)
  }
}

function clearMap(fullClear, shouldResetCurrentMapSource)
{
  fullClear = fullClear == null ? false : fullClear
  shouldResetCurrentMapSource = shouldResetCurrentMapSource != null ? shouldResetCurrentMapSource : true

  if (currentMapSource.getID() != currentCustomMapSource.getID() || currentCustomMapSource.getTextMapData().startsWith("date\n") || fullClear)
  {
    updateNavBarForNewSource(true)
    currentMapSource = NullMapSource
    if (shouldResetCurrentMapSource)
    {
      currentMapType.setCurrentMapSourceID(null)
    }

    toggleEditing(EditingState.viewing)
    if (currentViewingState != ViewingState.viewing)
    {
      currentViewingState = ViewingState.viewing
      currentMapZoomRegion = null
      currentMapType.resetOverrideSVGPath()
      loadMapSVGFile()
    }

    currentSliderDate = null

    if (fullClear)
    {
      currentCustomMapSource.clearMapData(true)
    }
  }
  else
  {
    currentCustomMapSource.clearMapData()
    loadDataMap(false, true)
  }

  if (showingCompareMap)
  {
    showingCompareMap = false

    $(".comparesourcecheckbox").prop('checked', false)

    compareMapSourceIDArray = [null, null]
    updateCompareMapSlidersVisibility()

    $(".compareitemtext").html("&lt;Empty&gt;")
    $(".compareitemimage").css('display', "none")
    $(".compareitemimage").attr('src', "")

    toggleMapSettingDisable("seatArrangement", false)
  }

  marginValues = cloneObject(defaultMarginValues)
  createMarginEditDropdownItems()

  updatePoliticalPartyCandidateNames()
  updateMapElectoralVoteText()

  displayRegionDataArray = {}
  populateRegionsArray()

  for (var partyNum in dropdownPoliticalPartyIDs)
  {
    if (dropdownPoliticalPartyIDs[partyNum] == TossupParty.getID()) { continue }
    politicalParties[dropdownPoliticalPartyIDs[partyNum]].setCandidateName(politicalParties[dropdownPoliticalPartyIDs[partyNum]].getNames()[0])
  }

  $('#outlines').children().each(function() {
    var regionDataCallback = getRegionData($(this).attr('id'))
    var regionIDsToFill = regionDataCallback.linkedRegionIDs
    var regionData = regionDataCallback.regionData

    updateRegionFillColors(regionIDsToFill, regionData, false)
  })
  displayPartyTotals(getPartyTotals())

  updateTotalsPieChart()
  if (currentRegionID != null)
  {
    updateRegionBox(currentRegionID)
  }

  $("#dataMapDateSliderContainer").hide()
  $("#dateDisplay").hide()

  $("#totalsPieChart").css("background-image", "")

  showingDataMap = false
}

function toggleHelpBox()
{
  showingHelpBox = !showingHelpBox
  if (showingHelpBox)
  {
    $("#helpboxcontainer").show()
    $("#toggleHelpBoxButton").addClass('active')
    $("#totalsPieChartContainer").hide()
    $("#partyDropdownsBoxContainer").hide()
    $("#discordInviteContainer").hide()
  }
  else
  {
    $("#helpboxcontainer").hide()
    $("#toggleHelpBoxButton").removeClass('active')
    $("#totalsPieChartContainer").show()
    $("#partyDropdownsBoxContainer").show()
    $("#discordInviteContainer").show()
  }
}

function selectCreditBoxTab(buttonDiv, contentDiv)
{
  $(buttonDiv).parent().children().removeClass('active')
  $(buttonDiv).addClass('active')
  $("#creditbox .tabcontent").hide()
  $(contentDiv).show()
}

function populateRegionsArray()
{
  $('#outlines').children().each(function() {
    var regionID = $(this).attr('id')
    for (var regexNum in regionIDsToIgnore)
    {
      if (regionIDsToIgnore[regexNum].test(regionID))
      {
        return
      }
    }
    if ($(this).attr(noCountSVGRegionAttribute) !== undefined || regionID === undefined)
    {
      return
    }

    displayRegionDataArray[regionID] = {partyID: TossupParty.getID(), margin: 0}
  })

  displayRegionDataArray[nationalPopularVoteID] = {partyID: TossupParty.getID(), margin: 0}
}

async function toggleEditing(stateToSet)
{
  if (editMarginID)
  {
    toggleMarginEditing(editMarginID)
  }
  if (editCandidateNamePartyID)
  {
    toggleCandidateNameEditing(editCandidateNamePartyID, null, true)
  }
  if (editPartyMarginColor)
  {
    toggleMarginHexColorEditing()
  }
  editingRegionEVs = false
  editingRegionMarginValue = false

  if (stateToSet == null)
  {
    switch (currentEditingState)
    {
      case EditingState.editing:
      currentEditingState = EditingState.viewing
      break

      case EditingState.viewing:
      currentEditingState = EditingState.editing
      break
    }
  }
  else
  {
    currentEditingState = stateToSet
  }

  switch (currentEditingState)
  {
    case EditingState.editing:
    $("#editDoneButton").html("Done")
    $("#editDoneButton").addClass('active')

    $("#regionboxcontainer").trigger('hide')

    $("#marginEditButton").hide()
    $("#marginEditButton").addClass('topnavdisable')
    $("#marginsDropdownContainer").hide()

    $("#shiftButton").show()
    $("#shiftButton").removeClass('topnavdisable')
    $("#shiftDropdownContainer").show()

    $("#fillDropdownContainer").css('display', "block")

    var currentMapIsCustom = (currentMapSource.isCustom())
    var currentMapDataForDate = currentSliderDate ? currentMapSource.getMapData()[currentSliderDate.getTime()] : displayRegionDataArray
    currentCustomMapSource.updateMapData(currentMapDataForDate, getCurrentDateOrToday(), !currentMapIsCustom, currentMapSource.getCandidateNames(getCurrentDateOrToday()))

    if (!currentMapIsCustom)
    {
      currentCustomMapSource.setCandidateNames(currentMapSource.getCandidateNames(getCurrentDateOrToday()), getCurrentDateOrToday())

      currentCustomMapSource.setDropdownPartyIDs(cloneObject(dropdownPoliticalPartyIDs))

      currentMapSource = currentCustomMapSource
      updatePoliticalPartyCandidateNames()
      updateNavBarForNewSource()
      await loadDataMap()
    }
    else
    {
      displayPartyTotals(getPartyTotals(), true)
    }
    deselectAllParties()
    break

    case EditingState.viewing:
    if (currentMapSource.isCustom())
    {
      $("#editDoneButton").html("Edit")
    }
    else
    {
      $("#editDoneButton").html("Copy")
    }
    $("#editDoneButton").removeClass('active')

    $("#marginEditButton").show()
    $("#marginEditButton").removeClass('topnavdisable')
    $("#marginsDropdownContainer").show()

    $("#shiftButton").hide()
    $("#shiftButton").addClass('topnavdisable')
    $("#shiftDropdownContainer").hide()

    $("#fillDropdownContainer").css('display', "none")

    if (currentMapSource.isCustom())
    {
      // Stuff for house editing that isn't done yet
      // var currentMapDataForDate = currentSliderDate ? currentMapSource.getMapData()[currentSliderDate.getTime()] : displayRegionDataArray
      // if (currentViewingState == ViewingState.zooming)
      // {
      //   currentMapDataForDate = mergeObject(currentMapDataForDate, displayRegionDataArray)
      // }

      currentCustomMapSource.updateMapData(displayRegionDataArray, getCurrentDateOrToday(), false, currentMapSource.getCandidateNames(getCurrentDateOrToday()))
      await loadDataMap()
      displayPartyTotals(getPartyTotals(), true)
    }

    if (showingDataMap && currentRegionID)
    {
      updateRegionBox(currentRegionID)
    }

    selectAllParties()
    break
  }

  updatePartyDropdownVisibility()
}

function leftClickRegion(div)
{
  if (currentEditingState == EditingState.editing)
  {
    if (ignoreNextClick)
    {
      ignoreNextClick = false
      return
    }

    var regionID = $(div).attr('id')
    if (regionIDsChanged.includes(regionID)) { return }

    var regionDataCallback = getRegionData(regionID)
    var regionData = regionDataCallback.regionData
    var regionIDsToFill = regionDataCallback.linkedRegionIDs

    if (regionData.disabled)
    {
      regionData.partyID = (selectedParty || TossupParty).getID()
      regionData.candidateName = regionData.candidateMap[regionData.partyID]
      regionData.margin = 101
    }
    else if (selectedParty != null && regionData.partyID != selectedParty.getID())
    {
      regionData.partyID = selectedParty.getID()
      regionData.candidateName = regionData.candidateMap[regionData.partyID]
      regionData.margin = marginValues.safe
    }
    else if (selectedParty != null)
    {
      var marginValueArray = Object.values(marginValues)
      var marginValueIndex = marginValueArray.indexOf(regionData.margin)
      if (marginValueIndex == -1)
      {
        for (var marginValueNum in marginValueArray)
        {
          if (regionData.margin >= marginValueArray[marginValueNum])
          {
            regionData.margin = marginValueArray[marginValueNum]
            break
          }
        }
        marginValueIndex = marginValueArray.indexOf(regionData.margin)
      }

      marginValueIndex += 1
      if (marginValueIndex > marginValueArray.length-1)
      {
        marginValueIndex = 0
      }

      // Hardcoding tilt = 0.1
      regionData.margin = marginValueIndex == marginValueArray.length-1 ? 0.1 : marginValueArray[marginValueIndex]
    }
    else
    {
      regionData.partyID = TossupParty.getID()
      regionData.margin = 0
    }

    updateRegionFillColors(regionIDsToFill, regionData)
    displayPartyTotals(getPartyTotals())
  }
  else if (currentMapSource.canZoom() && currentViewingState == ViewingState.viewing && showingDataMap)
  {
    var regionID = getBaseRegionID($(div).attr('id')).baseID
    currentViewingState = ViewingState.zooming
    currentMapZoomRegion = regionID.includes("-") ? regionID.split("-")[0] : regionID

    displayDataMap()
  }
  else if (showingDataMap)
  {
    currentMapSource.openRegionLink(currentRegionID ?? currentMapZoomRegion, currentSliderDate)
  }
}

function rightClickRegion(div)
{
  if (currentEditingState == EditingState.editing)
  {
    var regionDataCallback = getRegionData($(div).attr('id'))
    var regionData = regionDataCallback.regionData
    var regionIDsToFill = regionDataCallback.linkedRegionIDs

    if (regionData.disabled)
    {
      regionData.partyID = (selectedParty || TossupParty).getID()
      regionData.candidateName = regionData.candidateMap[regionData.partyID]
      regionData.margin = 101
    }
    else if (selectedParty != null && regionData.partyID != selectedParty.getID())
    {
      regionData.partyID = selectedParty.getID()
      regionData.candidateName = regionData.candidateMap[regionData.partyID]
      regionData.margin = 0.1 // Hardcoding tilt == 0.1
    }
    else if (selectedParty != null)
    {
      var marginValueArray = Object.values(marginValues)
      var marginValueIndex = marginValueArray.indexOf(regionData.margin)
      if (marginValueIndex == -1)
      {
        for (var marginValueNum in marginValueArray)
        {
          if (regionData.margin >= marginValueArray[marginValueNum])
          {
            regionData.margin = marginValueArray[marginValueNum]
            break
          }
        }
        marginValueIndex = marginValueArray.indexOf(regionData.margin)
      }

      marginValueIndex -= 1
      if (marginValueIndex < 0)
      {
        marginValueIndex = marginValueArray.length-1
      }

      // Hardcoding tilt == 0.1
      regionData.margin = marginValueIndex == marginValueArray.length-1 ? 0.1 : marginValueArray[marginValueIndex]
    }
    else
    {
      regionData.partyID = TossupParty.getID()
      regionData.margin = 0
    }

    updateRegionFillColors(regionIDsToFill, regionData)
    displayPartyTotals(getPartyTotals())
  }
}

function shiftClickRegion()
{
  if (currentEditingState == EditingState.editing)
  {
    editingRegionMarginValue = !editingRegionMarginValue

    if (editingRegionMarginValue)
    {
      updateRegionBox(currentRegionID)
    }
    else
    {
      $("#regionboxcontainer").trigger('hide')
    }
  }
  else if (currentViewingState == ViewingState.viewing && currentMapSource.isCustom())
  {
    editingRegionEVs = !editingRegionEVs
    updateRegionBox(currentRegionID)
  }
}

function altClickRegion(div)
{
  if (currentEditingState == EditingState.editing)
  {
    var regionDataCallback = getRegionData($(div).attr('id'))
    var regionData = regionDataCallback.regionData
    var regionIDsToFill = regionDataCallback.linkedRegionIDs

    regionData.partyID = (selectedParty || TossupParty).getID()

    if (regionData.disabled)
    {
      regionData.disabled = false
      regionData.margin = regionData.partyID == TossupParty.getID() ? 0 : 100
    }
    else
    {
      regionData.disabled = true
      regionData.margin = regionData.partyID == TossupParty.getID() ? 0 : 101
    }

    updateRegionFillColors(regionIDsToFill, regionData)
    updateMapElectoralVoteText()
    displayPartyTotals(getPartyTotals())
  }
}

function mapCloseButtonClicked()
{
  currentViewingState = ViewingState.viewing
  currentMapZoomRegion = null

  displayDataMap()
}

function getRegionData(regionID)
{
  var baseRegionIDCallback = getBaseRegionID(regionID)
  regionID = baseRegionIDCallback.baseID
  var linkedRegionIDs = baseRegionIDCallback.linkedIDs

  var regionData = displayRegionDataArray[regionID]

  return {regionData: regionData, linkedRegionIDs: linkedRegionIDs}
}

function getBaseRegionID(regionID)
{
  var linkedRegionIDs = [regionID]
  var foundRegion = regionID in displayRegionDataArray

  for (var linkedRegionSetNum in linkedRegions)
  {
    for (var linkedRegionIDNum in linkedRegions[linkedRegionSetNum])
    {
      if (linkedRegions[linkedRegionSetNum][linkedRegionIDNum] == regionID)
      {
        for (var linkedRegionIDNum2 in linkedRegions[linkedRegionSetNum])
        {
          var linkedRegionToTest = linkedRegions[linkedRegionSetNum][linkedRegionIDNum2]
          if (regionID != linkedRegionToTest)
          {
            linkedRegionIDs.push(linkedRegionToTest)
          }
          if (!foundRegion && linkedRegionToTest in displayRegionDataArray)
          {
            regionID = linkedRegionToTest
          }
        }
        return {baseID: regionID, linkedIDs: linkedRegionIDs}
      }
    }
  }

  return {baseID: regionID, linkedIDs: linkedRegionIDs}
}

async function updateRegionFillColors(regionIDsToUpdate, regionData, shouldUpdatePieChart)
{
  if (regionData == null) { return }

  var fillColor
  var shouldHide = false

  var canUseVoteSplitsForColor = regionData.margin == 0 && "partyVoteSplits" in regionData && regionData["partyVoteSplits"] != null
  if (regionData.partyID == null || regionData.partyID == TossupParty.getID() || canUseVoteSplitsForColor || (regionData.disabled == true && currentMapType.getMapSettingValue("mapCurrentSeats") == false))
  {
    if (regionData.disabled == true)
    {
      fillColor = regionDisabledColor

      var regionsToHide = currentMapType.getRegionsToHideOnDisable()
      for (var regexNum in regionsToHide)
      {
        if (regionsToHide[regexNum].test(regionData.region))
        {
          shouldHide = true
          break
        }
      }
    }
    else if (canUseVoteSplitsForColor)
    {
      var evenParties = getKeyForMaxValue(regionData.partyVoteSplits, true, 0)
      if (evenParties.length == 2 && evenParties.includes(DemocraticParty.getID()) && evenParties.includes(RepublicanParty.getID()))
      {
        fillColor = PoliticalPartyColors.purple.likely
      }
      else // Add better handling / more party combos
      {
        fillColor = TossupParty.getMarginColors().safe
      }
    }
    else
    {
      fillColor = TossupParty.getMarginColors().safe
    }
  }
  else
  {
    var marginIndex = getMarginIndexForValue(regionData.margin, regionData.partyID)
    fillColor = politicalParties[regionData.partyID].getMarginColors()[marginIndex]

    if (currentMapType.getMapSettingValue("flipStates") && regionData.flip)
    {
      var patternID = generateFlipPattern(regionData.partyID, marginIndex)

      fillColor = "url(#" + patternID + ")"
    }
  }

  for (var regionIDNum in regionIDsToUpdate)
  {
    var regionDiv = $("#" + regionIDsToUpdate[regionIDNum])
    regionDiv.css('animation-fill-mode', 'forwards')
    regionDiv.css('fill', fillColor)

    regionDiv.css('display', shouldHide ? 'none' : 'inherit')

    if (regionData.disabled == true && (currentMapSource.getID() != currentCustomMapSource.getID() || currentMapType.getMapSettingValue("mapCurrentSeats") === false))
    {
      regionDiv.css('pointer-events', 'none')
    }
    else
    {
      regionDiv.css('pointer-events', 'inherit')
    }
  }

  for (let regionID of regionIDsToUpdate)
  {
    $("#" + regionID + "-text").css('fill', regionData.disabled && !currentMapType.getMapSettingValue("mapCurrentSeats") ? 'gray' : 'white')
  }

  if (shouldUpdatePieChart == null || shouldUpdatePieChart == true)
  {
    updateTotalsPieChart()
  }
}

function getMarginIndexForValue(margin)
{
  if (margin == 101)
  {
    return "current"
  }
  for (var marginName in marginValues)
  {
    if (Math.abs(margin) >= marginValues[marginName])
    {
      return marginName
    }
  }
}

function generateFlipPattern(partyID, margin)
{
  var fillColor = politicalParties[partyID].getMarginColors()[margin]
  var patternID = fillColor.slice(1)

  if ($("#" + patternID).length == 0)
  {
    var patternHTML = '<pattern id="' + patternID + '" width="' + flipPatternWidth + '" height="' + flipPatternHeight + '" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">'
    patternHTML += '<rect x1="0" y1="0" width="' + flipPatternWidth + '" height="' + flipPatternHeight + '" style="fill: ' + fillColor + ';"></rect>'
    patternHTML += '<line x1="0" y1="0" x2="0" y2="' + flipPatternHeight + '" style="stroke: ' + multiplyBrightness(fillColor, flipPatternBrightnessFactor) + '; stroke-width: ' + flipPatternWidth + '"></line>'
    patternHTML += '</pattern>'

    var tempDiv = document.createElement('div');
    document.getElementById("svgdefinitions").appendChild(tempDiv)
    tempDiv.outerHTML = patternHTML;
  }

  return patternID
}

function generateFlipPatternsFromPartyMap(partyMap)
{
  for (var partyID in partyMap)
  {
    for (var margin in partyMap[partyID].getMarginColors())
    {
      generateFlipPattern(partyID, margin)
    }
  }
}

function getPartyTotals(includeFlipData)
{
  var partyTotals = {}
  var partyFlipTotals = {}
  var partyFlipData = {}

  for (var partyIDNum in mainPoliticalPartyIDs)
  {
    partyTotals[mainPoliticalPartyIDs[partyIDNum]] = 0
  }

  var shouldGetOriginalMapData = currentMapSource.getShouldUseOriginalMapDataForTotalsPieChart()
  var regionDataArray = shouldGetOriginalMapData && currentSliderDate ? currentMapSource.getMapData()[currentSliderDate.getTime()] : displayRegionDataArray

  for (var regionID in regionDataArray)
  {
    if (regionID == nationalPopularVoteID) { continue }

    var partyIDToSet = regionDataArray[regionID].partyID
    if (regionDataArray[regionID].partyID == null)
    {
      partyIDToSet = TossupParty.getID()
    }

    var currentRegionEV = currentMapType.getEV(getCurrentDecade(), regionID, regionDataArray[regionID])

    if (includeFlipData && regionDataArray[regionID].flip)
    {
      if (!(partyIDToSet in partyFlipTotals))
      {
        partyFlipTotals[partyIDToSet] = 0
        partyFlipData[partyIDToSet] = []
      }
      partyFlipTotals[partyIDToSet] += currentRegionEV
      partyFlipData[partyIDToSet].push({region: regionID, margin: regionDataArray[regionID].margin})
    }
    else
    {
      if (!(partyIDToSet in partyTotals))
      {
        partyTotals[partyIDToSet] = 0
      }
      partyTotals[partyIDToSet] += currentRegionEV
    }
  }

  Object.values(partyFlipData).forEach((partyData) => {
    partyData.sort((regionData1, regionData2) => regionData1.margin-regionData2.margin)
  })

  return includeFlipData ? {nonFlipTotals: partyTotals, flipTotals: partyFlipTotals, flipData: partyFlipData} : partyTotals
}

function getNationalPopularVotePartyVoteshareData()
{
  var popularVoteData = getNationalPopularVoteData()
  if (popularVoteData && "partyVotesharePercentages" in popularVoteData)
  {
    return popularVoteData.partyVotesharePercentages
  }
}

function getNationalPopularVoteData()
{
  if (nationalPopularVoteID in displayRegionDataArray && displayRegionDataArray[nationalPopularVoteID].partyID != TossupParty.getID())
  {
    return displayRegionDataArray[nationalPopularVoteID]
  }
}

function getCurrentDecade()
{
  var dateForDecade
  if (currentMapSource.isCustom() && showingCompareMap)
  {
    var compareDate = mapSources[compareMapSourceIDArray[0]].getMapDates()[$("#firstCompareDataMapDateSlider")[0].value-1]
    if (compareDate != null)
    {
      dateForDecade = new Date(compareDate)
    }
  }
  else if (currentMapType.getID() == USAPresidentialMapType.getID() && currentMapType.getMapSettingValue("evDecadeOverrideToggle"))
  {
    return currentMapType.getMapSettingValue("evDecadeOverrideSelection")
  }
  else if (currentSliderDate != null)
  {
    dateForDecade = currentSliderDate
  }
  return getDecadeFromDate(dateForDecade)
}

function getCurrentDateOrToday()
{
  var dateToUse = new Date(getTodayString("/", false, "mdy")).getTime()
  if (currentSliderDate)
  {
    dateToUse = currentSliderDate.getTime()
  }

  return dateToUse
}

async function updateRegionBox(regionID)
{
  var regionData = getRegionData(regionID).regionData
  if (regionID == null || regionData == null || regionData.partyID == null || regionData.partyID == TossupParty.getID() || regionData.disabled == true)
  {
    $("#regionboxcontainer").trigger('hide')
    return
  }
  $("#regionboxcontainer").trigger('show')

  if (editingRegionEVs)
  {
    $("#regionbox").html(getKeyByValue(mapRegionNameToID, currentRegionID) + "<div style='height: 10px'></div>" + "EV: <input id='regionEV-text' class='textInput' style='float: none; position: inherit' type='text' oninput='applyRegionEVEdit(\"" + regionID + "\")' value='" + currentMapType.getEV(getCurrentDecade(), regionID, regionData) + "'>")
    $("#regionEV-text").focus().select()
    return
  }

  var roundedMarginValue = getRoundedMarginValue(regionData.margin)
  var regionMarginString = (((currentMapSource.isCustom()) ? currentMapSource.getCandidateNames(currentSliderDate.getTime())[regionData.partyID] : regionData.candidateName) || politicalParties[regionData.partyID].getNames()[0]) + " +"

  if (editingRegionMarginValue)
  {
    $("#regionbox").html(getKeyByValue(mapRegionNameToID, currentRegionID) + "<div style='height: 10px'></div>" + "<span style='color: " + politicalParties[regionData.partyID].getMarginColors().lean + ";'>" + regionMarginString + "<input id='regionMargin-text' class='textInput' style='float: none; position: inherit' type='text' oninput='applyRegionMarginValue(\"" + regionID + "\")' value='" + roundedMarginValue + "'></span>")
    $("#regionMargin-text").focus().select()
    return
  }

  regionMarginString += roundedMarginValue

  if (regionData.chanceChallenger && regionData.chanceIncumbent)
  {
    regionMarginString += "<br></span><span style='font-size: 17px; padding-top: 5px; padding-bottom: 5px; display: block; line-height: 100%;'>Chances<br>"
    regionMarginString += "<span style='color: " + politicalParties[incumbentChallengerPartyIDs.challenger].getMarginColors().lean + ";'>" // Hardcoding challenger first
    regionMarginString += decimalPadding(Math.round(regionData.chanceChallenger*1000)/10)
    regionMarginString += "%</span>&nbsp;&nbsp;&nbsp;<span style='color: " + politicalParties[incumbentChallengerPartyIDs.incumbent].getMarginColors().lean + ";'>"
    regionMarginString += decimalPadding(Math.round(regionData.chanceIncumbent*1000)/10)
    regionMarginString += "%</span></span>"
  }

  if (regionData.partyVotesharePercentages && currentMapSource.getShouldShowVoteshare() == true)
  {
    var sortedPercentages = regionData.partyVotesharePercentages.sort((voteData1, voteData2) => {
      return voteData2.voteshare - voteData1.voteshare
    })

    regionMarginString += "<br></span><span style='font-size: 17px; padding-top: 5px; padding-bottom: 0px; display: block; line-height: 100%;'>Voteshare<br></span>"

    regionMarginString += "<div style='font-size: 17px; padding-top: 2px; padding-bottom: 5px; padding-right: 8px; display: block; line-height: 100%; border-radius: 50px;'>"

    sortedPercentages.forEach((voteData, i) => {
      regionMarginString += "<span id='voteshare-" + (voteData.partyID + "-" + voteData.candidate).hashCode() + "' style='display: inline-block; padding: 4px; color: #fff; border-radius: " + (i == 0 ? "3px 3px" : "0px 0px") + " " + (i == sortedPercentages.length-1 ? "3px 3px" : "0px 0px") + "; " + "background: linear-gradient(90deg, " + politicalParties[voteData.partyID].getMarginColors().safe + " " + (parseFloat(voteData.voteshare)) + "%, " + politicalParties[voteData.partyID].getMarginColors().lean + " 0%); " + " width: 100%'><span style='float: left;'>" + voteData.candidate + "</span><span style='float: right;'>"
      regionMarginString += decimalPadding(Math.round(voteData.voteshare*100)/100)
      regionMarginString += "%</span></span><br>"
    })

    regionMarginString += "</div>"
  }

  if (regionData.partyVoteSplits)
  {
    regionMarginString = "</span>"
    Object.keys(regionData.partyVoteSplits).sort((partyID1, partyID2) => {
      return regionData.partyVoteSplits[partyID2]-regionData.partyVoteSplits[partyID1]
    }).forEach((partyID, i) => {
      regionMarginString += "<div style='margin-top: " + (i == 0 ? 0 : -5) + "px; margin-bottom: " + (i < Object.keys(regionData.partyVoteSplits).length-1 ? 0 : 5) + "px; color: " + politicalParties[partyID].getMarginColors().lean + ";'>" + politicalParties[partyID].getNames()[0] + ": " + regionData.partyVoteSplits[partyID] + "</div>"
    })

    if (currentSliderDate && currentMapSource.getMapData())
    {
      var currentMapDataForDate = currentMapSource.getMapData()[currentSliderDate.getTime()]
      var zoomingData = await currentMapSource.getZoomingData(currentMapDataForDate, currentRegionID)

      const districtsPerLine = 3

      Object.keys(zoomingData).forEach((districtID, i) => {
        if (i % districtsPerLine == 0 && i != 0)
        {
          regionMarginString += "<br></div>"
        }
        if (i % districtsPerLine == 0)
        {
          var isLastDistrictLine = (i+((Object.keys(zoomingData).length-1) % districtsPerLine)) == Object.keys(zoomingData).length-1
          regionMarginString += "<div style='display: flex; justify-content: center; align-items: center; " + (isLastDistrictLine ? "margin-bottom: 4px" : "") + "'>"
        }
        if (i % districtsPerLine > 0)
        {
          regionMarginString += "&nbsp;&nbsp;"
        }

        var districtNumber = districtID.split("-")[1]
        var marginIndex = getMarginIndexForValue(zoomingData[districtID].margin, zoomingData[districtID].partyID)
        var marginColor = politicalParties[zoomingData[districtID].partyID].getMarginColors()[marginIndex]

        regionMarginString += (districtNumber == 0 ? "AL" : zeroPadding(districtNumber)) + ":&nbsp;<div style='display: inline-block; margin-top: 2px; border-radius: 2px; border: solid " + (zoomingData[districtID].flip ? "gold 3px; width: 11px; height: 11px;" : "gray 1px; width: 15px; height: 15px;") + " background-color: " + marginColor + "'></div>"
      })
    }
  }

  //Couldn't get safe colors to look good
  // + "<span style='color: " + politicalParties[regionData.partyID].getMarginColors()[getMarginIndexForValue(roundedMarginValue, regionData.partyID)] + "; -webkit-text-stroke-width: 0.5px; -webkit-text-stroke-color: white;'>"
  $("#regionbox").html((getKeyByValue(mapRegionNameToID, currentRegionID) || currentRegionID) + "<br>" + "<span style='color: " + politicalParties[regionData.partyID].getMarginColors().lean + ";'>" + regionMarginString + "</span>")

  updateRegionBoxYPosition()
}

function updateRegionBoxYPosition(mouseY)
{
  var newRegionBoxYPos = (mouseY+5) || (currentMouseY+5)
  if (!newRegionBoxYPos) { return }

  var regionBoxHeightDifference = $(document).height() - (newRegionBoxYPos+$("#regionboxcontainer").height())
  if (regionBoxHeightDifference < 0)
  {
    newRegionBoxYPos += regionBoxHeightDifference
  }
  $("#regionboxcontainer").css("top", newRegionBoxYPos)
}

function getRoundedMarginValue(fullMarginValue)
{
  return decimalPadding(roundValueToPlace(fullMarginValue, 2), currentMapSource.getAddDecimalPadding())
}

function applyRegionEVEdit(regionID)
{
  var regionData = getRegionData(regionID).regionData

  var shouldRefreshEV = false

  var newEV = parseInt($("#regionEV-text").val())
  if ($("#regionEV-text").val() == "")
  {
    delete overrideRegionEVs[regionID]
    shouldRefreshEV = true
  }

  var currentEV = currentMapType.getEV(getCurrentDecade(), regionID, regionData)
  if (!isNaN(newEV) && newEV > 0 && newEV != currentEV)
  {
    overrideRegionEVs[regionID] = newEV
    shouldRefreshEV = true

    $("#regionEV-text").val(newEV)
  }
  else if ($("#regionEV-text").val() != currentEV)
  {
    $("#regionEV-text").val(currentEV)
    $("#regionEV-text").select()
  }

  if (shouldRefreshEV)
  {
    updateMapElectoralVoteText()
    displayPartyTotals(getPartyTotals())
    updateTotalsPieChart()
  }
}

function applyRegionMarginValue(regionID)
{
  var regionDataCallback = getRegionData(regionID)
  var regionIDsToFill = regionDataCallback.linkedRegionIDs
  var regionData = regionDataCallback.regionData

  var newMarginString = $("#regionMargin-text").val()
  var newMargin = parseFloat(newMarginString)
  if (newMarginString == "")
  {
    newMargin = 1
  }
  var newMarginIsValid = /^\d+\.?\d*e?[\+\-]?\d*$/.test(newMarginString) && !isNaN(newMargin) && newMargin >= 0

  var currentMargin = getRoundedMarginValue(regionData.margin)
  if (newMarginIsValid && newMargin != currentMargin)
  {
    regionData.margin = newMargin
  }
  else if (!newMarginIsValid)
  {
    $("#regionMargin-text").val(currentMargin)
    $("#regionMargin-text").select()
  }

  updateRegionFillColors(regionIDsToFill, regionData, false)
  displayPartyTotals(getPartyTotals())
}

async function addCompareMapSource(mapSourceID, clickDivIDToIgnore)
{
  if (clickDivIDToIgnore != null)
  {
    ignoreMapUpdateClickArray.push(clickDivIDToIgnore)
  }

  var checkboxID = mapSourceID.replace(/\s/g, '') + "-compare"
  var checkboxChecked = $("#" + checkboxID).prop('checked')

  var compareSourcesUpdated
  var mapSourceToUncheck
  if (checkboxChecked && compareMapSourceIDArray[0] == null && compareMapSourceIDArray[1] == null)
  {
    compareSourcesUpdated = [true, true]
    compareMapSourceIDArray[0] = mapSourceID
    compareMapSourceIDArray[1] = mapSourceID
  }
  else if (checkboxChecked && compareMapSourceIDArray[0] == compareMapSourceIDArray[1])
  {
    compareSourcesUpdated = [false, true]
    compareMapSourceIDArray[1] = mapSourceID
  }
  else if (checkboxChecked)
  {
    compareSourcesUpdated = [true, true]
    mapSourceToUncheck = shouldSwapCompareMapSources(compareMapSourceIDArray[0], compareMapSourceIDArray[1]) ? compareMapSourceIDArray[0] : compareMapSourceIDArray[1]
    compareMapSourceIDArray[0] = compareMapSourceIDArray[0] == mapSourceToUncheck ? mapSourceID : compareMapSourceIDArray[0]
    compareMapSourceIDArray[1] = compareMapSourceIDArray[1] == mapSourceToUncheck ? mapSourceID : compareMapSourceIDArray[1]
  }
  else if (!checkboxChecked && compareMapSourceIDArray[0] != compareMapSourceIDArray[1])
  {
    if (compareMapSourceIDArray[0] == mapSourceID)
    {
      compareSourcesUpdated = [true, false]
      compareMapSourceIDArray[0] = compareMapSourceIDArray[1]
    }
    else if (compareMapSourceIDArray[1] == mapSourceID)
    {
      compareSourcesUpdated = [false, true]
      compareMapSourceIDArray[1] = compareMapSourceIDArray[0]
    }
  }
  else if (!checkboxChecked && compareMapSourceIDArray[0] == compareMapSourceIDArray[1])
  {
    clearMap()
    return
  }

  if (mapSourceToUncheck)
  {
    $("#" + mapSourceToUncheck.replace(/\s/g, '') + "-compare").prop('checked', false)
  }

  await updateCompareMapSources(compareSourcesUpdated, false)

  showingCompareMap = true
  toggleMapSettingDisable("seatArrangement", true)
  updateCompareMapSlidersVisibility()
}

function updateCompareMapSources(compareSourcesToUpdate, overrideSwapSources, swapSliderValues)
{
  var updateCompareMapSourcesPromise = new Promise(async (resolve) => {
    if (compareSourcesToUpdate[0])
    {
      let iconDivDictionary = getIconDivsToUpdateArrayForSourceID(compareMapSourceIDArray[0])
      $('.comparesourcecheckbox').prop('disabled', true)
      await downloadDataForMapSource(compareMapSourceIDArray[0], iconDivDictionary, null, false)
      $('.comparesourcecheckbox').prop('disabled', false)
    }
    if (compareSourcesToUpdate[1])
    {
      let iconDivDictionary = getIconDivsToUpdateArrayForSourceID(compareMapSourceIDArray[1])
      $('.comparesourcecheckbox').prop('disabled', true)
      await downloadDataForMapSource(compareMapSourceIDArray[1], iconDivDictionary, null, false)
      $('.comparesourcecheckbox').prop('disabled', false)
    }

    if (shouldSwapCompareMapSources(compareMapSourceIDArray[0], compareMapSourceIDArray[1]) && !overrideSwapSources)
    {
      swapCompareMapSources()
      compareSourcesToUpdate = [true, true]
    }

    var overrideDateValues = [null, null]
    if (swapSliderValues)
    {
      overrideDateValues[0] = $("#secondCompareDataMapDateSlider").val()
      overrideDateValues[1] = $("#firstCompareDataMapDateSlider").val()
    }

    var latestSliderTickEnabled = currentMapType.getMapSettingValue("latestTick")

    if (compareSourcesToUpdate[0])
    {
      setDataMapDateSliderRange(true, "firstCompareDataMapDateSlider", "firstCompareDataMapSliderStepList", mapSources[compareMapSourceIDArray[0]].getMapDates())
      $("#firstCompareDataMapDateSlider").val(overrideDateValues[0] || mapSources[compareMapSourceIDArray[0]].getMapDates().length+(latestSliderTickEnabled ? 1 : 0))
      setCompareSourceDate(0, overrideDateValues[0] || mapSources[compareMapSourceIDArray[0]].getMapDates().length+(latestSliderTickEnabled ? 1 : 0))
      $("#compareItemImage-0").css('display', "block")
      $("#compareItemImage-0").prop('src', mapSources[compareMapSourceIDArray[0]].getIconURL())
    }
    if (compareSourcesToUpdate[1])
    {
      setDataMapDateSliderRange(true, "secondCompareDataMapDateSlider", "secondCompareDataMapSliderStepList", mapSources[compareMapSourceIDArray[1]].getMapDates())
      $("#secondCompareDataMapDateSlider").val(overrideDateValues[1] || mapSources[compareMapSourceIDArray[1]].getMapDates().length+(latestSliderTickEnabled ? 1 : 0))
      setCompareSourceDate(1, overrideDateValues[1] || mapSources[compareMapSourceIDArray[1]].getMapDates().length+(latestSliderTickEnabled ? 1 : 0))
      $("#compareItemImage-1").css('display', "block")
      $("#compareItemImage-1").prop('src', mapSources[compareMapSourceIDArray[1]].getIconURL())
    }

    resolve()
  })

  return updateCompareMapSourcesPromise
}

function shouldSwapCompareMapSources(firstMapSourceID, secondMapSourceID)
{
  return mapSources[firstMapSourceID].getMapDates().slice(-1)[0] < mapSources[secondMapSourceID].getMapDates().slice(-1)[0]
}

function updateCompareMapSlidersVisibility(overrideShowHide)
{
  var showCompareSliders = overrideShowHide
  if (showCompareSliders == null)
  {
    showCompareSliders = showingCompareMap
  }

  if (showCompareSliders)
  {
    $("#firstCompareSliderDateDisplayContainer").show()
    $("#secondCompareSliderDateDisplayContainer").show()

    $("#sliderDateDisplayContainer").hide()
  }
  else
  {
    $("#firstCompareSliderDateDisplayContainer").hide()
    $("#secondCompareSliderDateDisplayContainer").hide()

    $("#sliderDateDisplayContainer").show()
  }

  if (showingCompareMap)
  {
    $("#compareButton").addClass('active')
    $("#compareArrayDropdownContainer").show()
    $("#comparePresetsDropdownContainer").hide()
  }
  else
  {
    $("#compareButton").removeClass('active')
    $("#comparePresetsDropdownContainer").show()
    $("#compareArrayDropdownContainer").hide()
  }
}

function setMapCompareItem(compareArrayIndex)
{
  if (!showingDataMap) { return }
  compareMapDataArray[compareArrayIndex] = cloneObject(displayRegionDataArray)
  $("#compareItem-" + compareArrayIndex).html(currentMapSource.getName() + " : " + getDateString(currentSliderDate))
}

function setCompareSourceDate(compareArrayIndex, dateIndex)
{
  var mapDates = mapSources[compareMapSourceIDArray[compareArrayIndex]].getMapDates()

  var dateToDisplay
  var overrideDateString
  if (dateIndex-1 > mapDates.length-1)
  {
    dateToDisplay = new Date(mapDates[dateIndex-1-1])
    overrideDateString = "Latest (" + getDateString(dateToDisplay, "/", false, true) + ")"
    // overrideDateString = "Latest (" + (zeroPadding(dateToDisplay.getMonth()+1)) + "/" + zeroPadding(dateToDisplay.getDate()) + "/" + dateToDisplay.getFullYear() + ")"
  }
  else
  {
    dateToDisplay = new Date(mapDates[dateIndex-1])
  }
  updateSliderDateDisplay(dateToDisplay, overrideDateString, compareArrayIndex == 0 ? "firstCompareDateDisplay" : "secondCompareDateDisplay")

  $("#compareItem-" + compareArrayIndex).html(mapSources[compareMapSourceIDArray[compareArrayIndex]].getName() + " (" + getDateString(dateToDisplay) + ")")

  compareMapDataArray[compareArrayIndex] = mapSources[compareMapSourceIDArray[compareArrayIndex]].getMapData()[dateToDisplay.getTime()]

  if (compareArrayIndex == 0)
  {
    currentCustomMapSource.setCandidateNames(mapSources[compareMapSourceIDArray[compareArrayIndex]].getCandidateNames(dateToDisplay.getTime()), dateToDisplay.getTime())
  }

  applyCompareToCustomMap()
}

function applyCompareToCustomMap()
{
  if (compareMapDataArray.length < 2 || compareMapDataArray[0] == null || compareMapDataArray[1] == null) { return }

  var resultMapArray = {}
  for (var regionID in compareMapDataArray[0])
  {
    var compareRegionData0 = compareMapDataArray[0][regionID]
    var compareRegionData1 = compareMapDataArray[1][regionID]

    if (currentMapType.getMapSettings().seatArrangement == "election-type" && compareRegionData0.seatClass != compareRegionData1.seatClass)
    {
      if (regionID.endsWith("-S"))
      {
        compareRegionData1 = compareMapDataArray[1][regionID.replace("-S", "")]
      }
      else
      {
        compareRegionData1 = compareMapDataArray[1][regionID + "-S"]
      }
    }

    if (compareRegionData0 && compareRegionData0.partyID == TossupParty.getID())
    {
      resultMapArray[regionID] = cloneObject(compareRegionData0)
    }
    else if (!compareRegionData0 || !compareRegionData1 || compareRegionData0.disabled == true || compareRegionData1.disabled == true)
    {
      resultMapArray[regionID] = cloneObject(compareRegionData0)
      resultMapArray[regionID].disabled = true
      resultMapArray[regionID].margin = 101
    }
    else
    {
      resultMapArray[regionID] = {}

      if (compareRegionData0.partyID == compareRegionData1.partyID)
      {
        resultMapArray[regionID].margin = compareRegionData0.margin-compareRegionData1.margin
      }
      else
      {
        resultMapArray[regionID].margin = compareRegionData0.margin+compareRegionData1.margin
      }

      if (resultMapArray[regionID].margin < 0)
      {
        var sortedVoteshareArray = compareRegionData0.partyVotesharePercentages.sort((cand1, cand2) => cand2.voteshare - cand1.voteshare)
        resultMapArray[regionID].partyID = sortedVoteshareArray.length >= 2 ? sortedVoteshareArray[1].partyID : TossupParty.getID()
        resultMapArray[regionID].margin = Math.abs(resultMapArray[regionID].margin)
      }
      else
      {
        resultMapArray[regionID].partyID = compareRegionData0.partyID
      }

      if (compareRegionData0.seatClass)
      {
        resultMapArray[regionID].seatClass = compareRegionData0.seatClass
      }
    }
  }

  currentCustomMapSource.updateMapData(resultMapArray, (new Date(getTodayString("/", false, "mdy"))).getTime(), true)
  currentMapSource = currentCustomMapSource
  updateNavBarForNewSource()
  loadDataMap()
}
