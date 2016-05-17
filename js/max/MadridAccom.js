//Global variables
var map;
var accomodsDataList;
var accomMarkers = new L.LayerGroup();
var actualMarker;
var actualAccom = null;
//  myCollections = [{name: "collection name", id: "id", items: [AccommId, ...]}, ..]
var myCollections = [];
var actualColl = null;
// accommodatedUsers = {accomId: [id1, id2, ...]}
var accommodatedUsers = {};
var tokenGithubOauth = '';
var nominatimResults = [];
var markerNominatim;

//Some Google+ ids: +TimBunch, +DustinStout, +JesusMGonzalezBarahona, +GregorioRobles, 111081903225988874848

// DOCUMENT READY AL FINAL DEL JS

/**************************************************
 **             SIMPLE FUNCTIONS                 **
 **************************************************/
function showWarning(message) {
    $('<div class="alert alert-warning  alert-dismissible fade in" role="alert">' +
            '<span class="glyphicon glyphicon-exclamation-sign" aria-hidden="true"></span> ' +
            '<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">×</span></button>' +
            message + '</div>')
        .appendTo('#alerts-list')
        .delay(4000).slideUp(500, function() {
            $('#alerts-list').children(':hidden').alert('close');
        });
}

function showInfo(message) {
    $('<div class="alert alert-info  alert-dismissible fade in" role="alert">' +
            '<span class="glyphicon glyphicon-exclamation-sign" aria-hidden="true"></span> ' +
            '<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">×</span></button>' +
            message + '</div>')
        .appendTo('#alerts-list')
        .delay(3500).slideUp(500, function() {
            $('#alerts-list').children(':hidden').alert('close');
        });
}

function getAccommodation(id) {
    if (!accomodsDataList) {
        showWarning("Carga primero los alojamientos");
        throw "Accommodations haven't been loaded yet";
    }
    var accom = null;
    for (var i = 0; i < accomodsDataList.length; i++) {
        if (accomodsDataList[i]['@id'] === id) {
            accom = accomodsDataList[i];
            break;
        }
    }
    return accom;
}

// Reset the information and change to the new data
function changeInfo(infoObj) {
    accommodatedUsers = infoObj.accommodatedUsers;
    myCollections = infoObj.myCollections;
    actualColl = null;
    $('.actualCollectionTitle').html('');
    $('.collecAccomList').html('<li class="list-group-item list-group-item-warning">No se ha seleccionado ninguna colección</li>');
    $('#accommodated-list').html('<p>Ningún usuario se ha alojado.</p>');
    accomMarkers.clearLayers();
    if (myCollections.length > 0) {
        $('#collectionslist').html('');
        myCollections.forEach(function(coll) {
            $('#collectionslist').append('<li id="' + coll.id + '" class="list-group-item collection">' + coll.name + '</li>');
        });
        $('#collectionslist > .collection').click(function(event) {
            showCollection(event.target.id);
        });
    } else {
        $('#collectionslist').html('<li class="list-group-item list-group-item-warning">No hay colecciones, crea una</li>');
    }

    localStorage.setItem('myCollections', JSON.stringify(myCollections));
    localStorage.setItem('accommodatedUsers', JSON.stringify(accommodatedUsers));
}

/**************************************************
 **                LOCAL STORAGE                 **
 **************************************************/

function loadFromLocalStorage() {
    var collections = localStorage.getItem('myCollections');
    var usersgoogle = localStorage.getItem('accommodatedUsers');
    changeInfo({
        'myCollections': JSON.parse(collections) || [],
        'accommodatedUsers': JSON.parse(usersgoogle) || {}
    });
}

/**************************************************
 **                  GITHUB                      **
 **************************************************/
// Handle authentication login in github
function loadOauthLogin() {
    hello.init({github: "0c2f259e12c21ae95982"},
               {redirect_uri: 'redirect-github.html'});
    var access = hello("github");
    access.login({
        response_type: 'code'
    }).then(function() {
        var auth = hello("github").getAuthResponse();
        tokenGithubOauth = auth.access_token;
        $('#result-oauth').fadeOut(500).delay(500).removeClass();
        $('#result-oauth').addClass('glyphicon glyphicon-ok').delay(500).fadeIn(500);
    }, function(err) {
        console.log(err);
        showWarning('Error al acceder: ' + err.error.message);
        $('#result-oauth').removeClass();
        $('#result-oauth').addClass('glyphicon glyphicon-remove');
    });
}

// Download the information from the user/repository/file and call changeInfo
function loadFileRepo(event) {
    event.preventDefault();
    var userLoad = $('#user-repo').val();
    var repoLoad = $('#repo').val();
    var file = $('#file').val();
    if (userLoad && repoLoad && file) {
        var github = new Github({
            token: tokenGithubOauth || $('#auth-token').val(),
            user: $('#auth-user').val(),
            password: $('#auth-password').val()
        });
        var repo = github.getRepo(userLoad, repoLoad);
        repo.read('master', file, function(err, newInfo) {
            if (err) {
                showWarning('Error al cargar el archivo: ' + err.toString());
            } else {
                changeInfo(JSON.parse(newInfo));
                showInfo('Datos de Github cargados');
            }
            $('#user-repo').val('');
            $('#repo').val('');
            $('#file').val('');
            $('#auth-token').val('');
            $('#auth-user').val('');
            $('#auth-password').val('');
            $('#load-save-modal').modal('hide');
        });
    } else {
        showWarning('Faltan datos por completar');
    }
}

//Save the information to the user/repository/file
function saveInfoRepo(event) {
    event.preventDefault();
    var userSave = $('#user-repo').val();
    var repoSave = $('#repo').val();
    var fileSave = $('#file').val();
    var tokenAuth = $('#auth-token').val() || tokenGithubOauth;
    var userAuth = $('#auth-user').val();
    var passAuth = $('#auth-password').val();

    if ((userSave && repoSave && fileSave) && (tokenAuth || userAuth && passAuth)) {
        var github = new Github({
            token: tokenAuth,
            username: userAuth,
            password: passAuth,
            auth: "oauth"
        });
        var repo = github.getRepo(userSave, repoSave);
        var info = {
            "accommodatedUsers": accommodatedUsers,
            "myCollections": myCollections
        };
        repo.write('master', fileSave,
            JSON.stringify(info), "Data saved",
            function(err) {
                if (err) {
                    showWarning('No se han podido guardar los datos: ' + err.error);
                    console.log(err);
                } else {
                    showInfo('Datos guardados correctamente');
                    $('#user-repo').val('');
                    $('#repo').val('');
                    $('#file').val('');
                    $('#auth-token').val('');
                    $('#auth-user').val('');
                    $('#auth-password').val('');
                    $('#load-save-modal').modal('hide');
                }
            });
    } else {
        showWarning('Faltan datos por completar');
    }
}

/**************************************************
 **       ACCOMMODATIONS AND COLLECTIONS         **
 **************************************************/
// When "load accommodations" is pressed, get the json and show the names in a list
function loadAccommodations() {
    var $btn = $(".loadAccommodBtn").html('Cargando...');
    //$.ajaxSetup({cache: false});
    $.getJSON('data/alojamientos.json')
        .done(function(data) {
            accomodsDataList = data.serviceList.service;
            $('.allaccomods').html('');
            var list = '';
            accomodsDataList.forEach(function(accommod, position) {
                list += '<li class="list-group-item row"><span id="accommod-' + accommod['@id'] + '"class="accommodation col-sm-10 col-xs-10">' + accommod.basicData.title +
                    '</span><span class="glyphicon glyphicon-plus col-sm-2 col-xs-2 add-accom-btn" aria-hidden="true"></span></li>';
            });
            $('.allaccomods').html(list);
            $('.allaccomods .accommodation').click(showAccommodation);
            $('.allaccomods li').draggable({
                revert: "invalid",
                scroll: false,
                helper: 'clone'
            });
            $('.add-accom-btn').click(addAccomToCollClick);
            $btn.html('Cargados <span class="badge">' + accomodsDataList.length + '</span>');
        })
        .fail(function() {
            $('.allaccomods').html('<li class="list-group-item list-group-item-danger">Error al cargar los alojamientos</li>');
            $btn.html("Reintentar");
        });
}

// Event triggered when click add a new accommodation
function addAccomToCollClick(event) {
    var elementAccom = $(event.target).parent().children('.accommodation')[0];
    var idAccom = elementAccom.id.split('-')[1];
    var titleAccom = elementAccom.innerHTML;
    addAccomToColl(idAccom, titleAccom);
}

function addClassHoverColl(event) {
    if (actualColl) {
        $(event.target).addClass("table-hover-good");
    } else {
        $(event.target).addClass("table-hover-bad");
    }
}

function delClassHoverColl(event) {
    $(event.target).removeClass("table-hover-good table-hover-bad");
}

// Event triggered when drop a new accommodation
function addAccomToCollDrop(event, ui) {
    delClassHoverColl(event, ui);
    var elementAccom = $(ui.draggable[0]).children('.accommodation')[0];
    var idAccom = elementAccom.id.split('-')[1];
    var titleAccom = elementAccom.innerHTML;
    addAccomToColl(idAccom, titleAccom);
}

function addAccomToColl(idAccom, titleAccom) {
    if (actualColl) {
        if (actualColl.items.indexOf(idAccom) > -1) {
            showWarning(titleAccom + " ya está en la colección");
        } else {
            actualColl.items.push(idAccom);
            showCollection(actualColl.id);
            localStorage.setItem('myCollections', JSON.stringify(myCollections));
        }
    } else {
        showWarning("Tienes que seleccionar primero una colección");
    }
}

// Create a new collection
function createCollection() {
    var nameColl = $('#nameNewCollect').val();
    if (nameColl) {
        var thisColl = {
            "name": nameColl,
            "id": 'collec-' + myCollections.length,
            "items": []
        };
        if (myCollections.length === 0) {
            $('#collectionslist').html('');
        }
        myCollections.push(thisColl);
        localStorage.setItem('myCollections', JSON.stringify(myCollections));
        $('#collectionslist').append('<li id="' + thisColl.id + '" class="list-group-item collection">' + thisColl.name + '</li>');
        $('#collectionslist > #' + thisColl.id).click(function(event) {
            showCollection(event.target.id);
        });
        showCollection(thisColl.id);
    } else {
        showWarning('Escribe un nombre de colección');
    }
    $('#nameNewCollect').val("");
}

// Change to a different collection
function showCollection(idColl) {
    actualColl = myCollections[idColl.split('-')[1]];
    $('.actualCollectionTitle').html(actualColl.name);
    var list = "";
    var coords = [];
    actualColl.items.forEach(function(idaccom) {
        var accomAux = getAccommodation(idaccom);
        coords.push({
            "coord": [accomAux.geoData.latitude, accomAux.geoData.longitude],
            "name": accomAux.basicData.title,
            "id": accomAux['@id']
        });
        list += '<li id="accommod-' + accomAux['@id'] + '" class="list-group-item accommodation">' + accomAux.basicData.title + '</li>';
    });
    if (list === "") {
        list += '<li class="list-group-item list-group-item-warning">No hay alojamientos</li>';
    }
    $('.collecAccomList').html(list);
    $('.collecAccomList > .accommodation').click(showAccommodation);
    changeAccomMarkers(coords);
}

// Change the images of the accommodation
function changeImagesAccom(images) {
    var gridImages = '';
    images.forEach(function(img, pos) {
        if (pos % 2 === 0) {
            gridImages += '<div class="row"><img class="img-responsive col-md-6" src="' + img + '" alt="Foto alojamiento"/>';
        } else {
            gridImages += '<img class="img-responsive col-md-6" src="' + img + '" alt="Foto alojamiento"/></div>';
        }
    });
    if (images.length % 2 !== 0) {
        gridImages += '</div>';
    }
    $('.images').html(gridImages);
    $('.images img').click(function() {
        $('#img-modal').modal();
    });
}

// Fill the carousel with the url images given in the array
function representCarousel(images) {
    var urlCarousel = $('#imagesUrlSlider');
    var indicCarousel = $('#indicatorsSlider');

    urlCarousel.html('');
    indicCarousel.html('');
    images.forEach(function(url, pos) {
        if (pos === 0) {
            indicCarousel.append('<li data-target="#carousel-images" data-slide-to="0" class="active"></li>');
            urlCarousel.append('<div class="item active"><img src="' + url + '"></div>');
        } else {
            indicCarousel.append('<li data-target="#carousel-images" data-slide-to="' + pos + '"></li>');
            urlCarousel.append('<div class="item"><img src="' + url + '"></div>');
        }
    });
    $('.carousel').carousel();
}

// Show accommodation in the map and information at the bottom
function showAccommodation(event) {
    var id = event.target.id.split('-')[1];
    actualAccom = getAccommodation(id);

    // Get data
    var coord = [actualAccom.geoData.latitude, actualAccom.geoData.longitude];
    var name = actualAccom.basicData.name;
    var categ = actualAccom.extradata.categorias.categoria.item[1]['#text'];
    var text = actualAccom.basicData.body || '<p>No se encontró información acerca de este hotel</p>';
    var url = actualAccom.basicData.web;
    var numstars = 0;
    if (('subcategorias' in actualAccom.extradata.categorias.categoria) && (categ !== 'Camping')) {
        numstars = actualAccom.extradata.categorias.categoria.subcategorias.subcategoria.item[1]['#text'].split(' ')[0];
    }
    var images = [];
    if (actualAccom.multimedia && actualAccom.multimedia.media) {
        if ($.isArray(actualAccom.multimedia.media)) {
            images = actualAccom.multimedia.media.map(function(img) {
                return img.url;
            });
        } else {
            images.push(actualAccom.multimedia.media.url);
        }
    }
    var usersAccom = accommodatedUsers[id] || [];
    // Animation for showing description
    $('.hotel-info').hide('blind', function() {
        // Represent data
        $('a.titleAccommodShow').html(name).attr('href', url);
        $('.hotel-text').html(text);
        $('.starsAccommodShow').html('');
        for (var i = 0; i < numstars; i++) {
            $('.starsAccommodShow').append('<span class="glyphicon glyphicon-star" aria-hidden="true"></span>');
        }
        // Images accommodation
        changeImagesAccom(images)
        representCarousel(images);
        $('.hotel-info').show('blind');
    });
    // Change Google+
    if (usersAccom.length === 0) {
        $('#accommodated-list').html('<p>Ningún usuario se ha alojado.</p>');
    } else {
        $('#accommodated-list').html('');
        usersAccom.forEach(function(userId) {
            gapi.client.load('plus', 'v1', function() {
                gapi.client.plus.people.get({'userId': userId})
                    .execute(function(resp) {
                        if (!resp.error) {
                            appendUserAccommodated(resp);
                        }
                    });
            });
        });
    }
    //Change Map
    if (actualMarker) {
        map.removeLayer(actualMarker);
    }
    actualMarker = L.marker(coord).addTo(map).bindPopup(name).openPopup();
    map.setView(coord, 14);
}


/**************************************************
 **                 GOOGLE +                     **
 **************************************************/
function initGooglePlus() {
    gapi.client.setApiKey("AIzaSyA4v3iLxJ_gJdlGujFkXgN8y_3YTL2ThOg");
}


function newUserAccommodated(event) {
    event.preventDefault();
    var userId = $('#google-id-new').val();

    if (!userId) {
        showWarning('Introduce un identificador de Google+');
    } else if (!actualAccom) {
        showWarning('Selecciona un alojamiento');
    } else {
        var usersThisAccom = accommodatedUsers[actualAccom['@id']];
        if (usersThisAccom && usersThisAccom.indexOf(userId) > -1) {
            showWarning('Este usuario ya fue añadido');
            $('#google-id-new').val('');
            return;
        }
        gapi.client.load('plus', 'v1', function() {
            gapi.client.plus.people.get({'userId': userId})
                .execute(function(resp) {
                    if (resp.error) {
                        showWarning('Problema con el id indicado: ' + resp.error.message);
                    } else {
                        if (!accommodatedUsers[actualAccom['@id']]) {
                            accommodatedUsers[actualAccom['@id']] = [userId];
                        } else {
                            accommodatedUsers[actualAccom['@id']].push(userId);
                        }
                        $('#google-id-new').val('');
                        appendUserAccommodated(resp);
                        localStorage.setItem('accommodatedUsers', JSON.stringify(accommodatedUsers));
                    }
                });
        });
    }
}

// Guive the response of gapi.client.plus.people.get
// Better adaptation to all devices
function appendUserAccommodated(resp) {
    var htmlAppend = '<div class="col-md-4 col-sm-6 panel panel-default gog-person">' +
        '<div class="panel-body row">' +
        '<img src="' + resp.result.image.url.split('?')[0] + '" class="img-responsive img-circle col-sm-4"/>' +
        '<div class="col-sm-8">' +
        '<h4>' + resp.result.displayName + '</h4>' +
        '<a href="' + resp.result.url + '">Perfil Google+</a>' +
        '</div>' +
        '</div>' +
        '</div>';
    var done = false;
    if ($('#accommodated-list').children('p').length > 0) {
        $('#accommodated-list').html('');
    }
    $.each($('#accommodated-list').children('div.row'), function(index, element) {
        if ($(element).children('div').length < 3 && !done) {
            $(element).append(htmlAppend);
            done = true;
        }
    });
    if (!done) {
        $('<div class="row">').appendTo('#accommodated-list').append(htmlAppend);
    }
}


/**************************************************
 **                   MAP                        **
 **************************************************/
var pushpin = L.icon({
    iconUrl: "../images/chincheta.png",
    iconSize: [37, 37],
    iconAnchor: [2, 33],
    popupAnchor: [20, -30]
});

// Store the markers of the collection selected
// accoms must be an array of {coord: [lat, lon], name: name, id: 7654}
function changeAccomMarkers(accoms) {
    accomMarkers.clearLayers();
    accoms.forEach(function(accom) {
        L.marker(accom.coord, {
            icon: pushpin
        }).addTo(accomMarkers).bindPopup(accom.name);
    });
}

function startMap() {
    map = L.map('map', {
        center: [40.383333, -3.716667],
        zoom: 10
    });
    L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    L.control.layers({}, {
        "Alojamientos de colección": accomMarkers
    }).addTo(map);
}

// Search in nominatim osm and show the contents in a list
function searchNominatim(event) {
    event.preventDefault();
    var search = $('#nominatim-input').val();
    $('#nominatim-list-result').html('');
    if (search) {
        $('#nominatim-list-result').html('<li class="list-group-item"><div class="progress">' +
          '<div class="progress-bar progress-bar-striped active" role="progressbar" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100" style="width: 100%"></div>' +
        '</div></li>');
        var urlSearch = 'http://nominatim.openstreetmap.org/search?countrycodes=es&limit=10&format=json&polygon_geojson=1&q=' + search;
        var results = '';
        $.getJSON(urlSearch, function(data) {
            $('#nominatim-list-result').html('');
            data.forEach(function(element) {
                var nameAux = element.display_name;
                if (nameAux.search('Madrid') !== -1) {
                    if (nameAux.search(', Área metropolitana de Madrid')) {
                        nameAux = element.display_name.split(', Área metropolitana de Madrid')[0];
                    }
                    var idAux = 'nominatim-' + nominatimResults.length;
                    nominatimResults.push(element);
                    if (element.icon) {
                        var icon = '<img class="media-object" src="' + element.icon + '">';
                    } else {
                        var icon = '<span class="glyphicon glyphicon-map-marker" aria-hidden="true"></span>';
                    }
                    results += '<li class="list-group-item media nominatim-result" id="' + idAux + '">' +
                    '<div class="media-left">' + icon + '</div>' +
                    '<div class="media-body">' + nameAux + '</div></li>';
                }
            });
            if (!results) {
                results = '<li class="list-group-item">No se ha encontrado ninguna coincidencia en Madrid</li>';
            }
            $('#nominatim-list-result').append(results);
            $('.nominatim-result').click(showResultInMap);
        });
    }
}

// When a result of nominatim is pressed, show it in the map
function showResultInMap(event) {
    var id = this.id.split('nominatim-')[1];
    var location = nominatimResults[id];
    var geojsonMarkerOptions = {
        radius: 8,
        fillColor: "#0000ff",
        fillOpacity: 0.5
    };

    if (markerNominatim) {
        map.removeLayer(markerNominatim);
    }
    markerNominatim = L.geoJson(location.geojson, {
        style: {
            "color": "#0000ff",
            "opacity": 0.5
        },
        pointToLayer: function(feature, latlng) {
            return L.circleMarker(latlng, geojsonMarkerOptions);
        }
    }).addTo(map);
    if (location.boundingbox) {
        map.fitBounds([
            [location.boundingbox[0], location.boundingbox[2]],
            [location.boundingbox[1], location.boundingbox[3]]
        ]);
    } else {
        map.setView([location.lat, location.lon], 15);
    }
}


/**************************************************
 **             OTHER FUNCTIONS                  **
 **************************************************/

//Filter the list by typing in an input text
function filterList(e) {
    var list = $(e.target).parent().children('.listItems').children();
    var inputfilt = e.target.value.toLowerCase();
    for (var i = 0; i < list.length; i++) {
        if ($(list[i]).html().toLowerCase().includes(inputfilt)) {
            $(list[i]).show();
        } else {
            $(list[i]).hide();
        }
    }
}

$(document).ready(function() {
    loadFromLocalStorage();
    startMap();
    $('.loadAccommodBtn').on('click', loadAccommodations);
    $('.filterList').keyup(filterList);
    $('#mainTabs a').click(function(e) {
        e.preventDefault();
        $(e.target).tab('show');
    });
    $('#createCollectBtn').click(createCollection);
    $('.actualCollectionPanel').droppable({
        over: addClassHoverColl,
        out: delClassHoverColl,
        drop: addAccomToCollDrop
    });
    $('#load-save-btn').click(function() {
        $('#load-save-modal').modal();
    });
    $('#load-btn').click(loadFileRepo);
    $('#save-btn').click(saveInfoRepo);
    $('.google-id-new-btn').click(newUserAccommodated);
    $('#oauth').click(loadOauthLogin);
    $('#nominatim-search').click(searchNominatim);
});
