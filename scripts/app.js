/**
 *
 * Copyright 2015 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
APP.Main = (function() {

  var LAZY_LOAD_THRESHOLD = 300;
  var $ = document.querySelector.bind(document);

  var stories = null;
  var storyStart = 0;
  var count = 100;
  var main = $('main');
  var inDetails = false;
  var storyLoadCount = 0;
  var localeData = {
    data: {
      intl: {
        locales: 'en-US'
      }
    }
  };

  var tmplStory = $('#tmpl-story').textContent;
  var tmplStoryDetails = $('#tmpl-story-details').textContent;
  var tmplStoryDetailsComment = $('#tmpl-story-details-comment').textContent;

  // Create the section of the story details DOM. Story details will use this DOM section. The original code create a new DOM for every click
  var storyDetails = document.createElement('section');
  storyDetails.classList.add('story-details');
  document.body.appendChild(storyDetails);

  if (typeof HandlebarsIntl !== 'undefined') {
    HandlebarsIntl.registerWith(Handlebars);
  } else {

    // Remove references to formatRelative, because Intl isn't supported.
    var intlRelative = /, {{ formatRelative time }}/;
    tmplStory = tmplStory.replace(intlRelative, '');
    tmplStoryDetails = tmplStoryDetails.replace(intlRelative, '');
    tmplStoryDetailsComment = tmplStoryDetailsComment.replace(intlRelative, '');
  }

  var storyTemplate =
      Handlebars.compile(tmplStory);
  var storyDetailsTemplate =
      Handlebars.compile(tmplStoryDetails);
  var storyDetailsCommentTemplate =
      Handlebars.compile(tmplStoryDetailsComment);

  /**
   * As every single story arrives in shove its
   * content in at that exact moment. Feels like something
   * that should really be handled more delicately, and
   * probably in a requestAnimationFrame callback.
   */
  function onStoryData (key, details) {
    var storyElements =  document.getElementsByClassName('.header')[0].getElementById("s-" + key);
    details.time *= 1000;
    var story = storyElements[i];
    var html = storyTemplate(details);
    story.innerHTML = html;
    story.addEventListener('click', onStoryClick.bind(this, details));
    story.classList.add('clickable');
    storyLoadCount--;
  }

  function onStoryClick(details) {

    storyDetails = $('sd-' + details.id);
    // Wait a little time then show the story details.
    setTimeout(showStory.bind(this, details.id), 0);

    // showStory.bind(this, details.id) ;
    // Create and append the story. A visual change...
    // perhaps that should be in a requestAnimationFrame?
    // And maybe, since they're all the same, I don't
    // need to make a new element every single time? I mean,
    // it inflates the DOM and I can only see one at once.
    if (!storyDetails) {
      if (details.url)
        details.urlobj = new URL(details.url);

      var comment;
      var commentsElement;
      var storyHeader;
      var storyContent;

      var storyDetailsHtml = storyDetailsTemplate(details);
      var kids = details.kids;
      var commentHtml = storyDetailsCommentTemplate({
        by: '', text: 'Loading comment...'
      });

      // storyDetails = document.createElement('section');
      var storyDetails = document.getElementsByClassName('story-details')[0];
      storyDetails.setAttribute('id', 'sd-' + details.id);
      // storyDetails.classList.add('story-details');
      storyDetails.innerHTML = storyDetailsHtml;
      // document.body.appendChild(storyDetails);
      commentsElement = storyDetails.getElementsByClassName('js-comments')[0];
      storyHeader = storyDetails.getElementsByClassName('js-header')[0];
      storyContent = storyDetails.getElementsByClassName('js-content')[0];

      var closeButton = storyDetails.getElementsByClassName('js-close')[0];
      closeButton.addEventListener('click', hideStory.bind(this, details.id));

      // var headerHeight = storyHeader.getBoundingClientRect().height;  << force synchronous layout
      var headerHeight = 16;
      storyContent.style.paddingTop = headerHeight + 'px';

      if (typeof kids === 'undefined')
        return;
      console.log(kids.length);
      for (var k = 0; k < kids.length; k++) {
        comment = document.createElement('aside');
        comment.setAttribute('id', 'sdc-' + kids[k]);
        comment.classList.add('story-details__comment');
        comment.innerHTML = commentHtml;
        commentsElement.appendChild(comment);
        // Update the comment with the live data.
        APP.Data.getStoryComment(kids[k], function(commentDetails) {
          commentDetails.time *= 1000;
          var comment = commentsElement.querySelector(
              '#sdc-' + commentDetails.id);
          comment.innerHTML = storyDetailsCommentTemplate(
              commentDetails,
              localeData);
        });
      }

    }
  }

  function showStory(id) {

    if (inDetails)
      return;

    inDetails = true;
    console.log(id);
    var storyDetails = $('#sd-' + id);
    var left = null;
    var storyDetailsPosition = storyDetails.getBoundingClientRect();
    if (!storyDetails)
      return;

    document.body.classList.add('details-active');
    storyDetails.style.opacity = 1;
    //var storyDetailsPosition = storyDetails.getBoundingClientRect();
    // console.log(storyDetailsPosition);

    function animate () {
      if (left === null)
        left = storyDetailsPosition.left;
      left += (0 - storyDetailsPosition.left) * 0.1;
      if (Math.abs(left) > 0.5)
        requestAnimationFrame(animate);
      else
        left = 0;
      storyDetails.style.left = left + 'px';
    }
    requestAnimationFrame(animate);
  }


  function hideStory(id) {
    if (!inDetails)
      return;

    var storyDetails = $('#sd-' + id);
    var left = 0;

    document.body.classList.remove('details-active');
    storyDetails.style.opacity = 0;
    var mainPosition = main.getBoundingClientRect();
    var storyDetailsPosition = storyDetails.getBoundingClientRect(); // forced sysnchronous layout

    function animate () {
      var target = mainPosition.width + 100;
      left += (target - storyDetailsPosition.left) * 0.1;
      if (Math.abs(left - target) > 0.5) {
        requestAnimationFrame(animate);
      } else {
        left = target;
        inDetails = false;
      }
      // And update the styles. Wait, is this a read-write cycle?
      // I hope I don't trigger a forced synchronous layout!
      storyDetails.style.left = left + 'px';
    }
    requestAnimationFrame(animate);
  }


  main.addEventListener('touchstart', function(evt) {
    // I just wanted to test what happens if touchstart
    // gets canceled. Hope it doesn't block scrolling on mobiles...
    if (Math.random() > 0.97) {
      evt.preventDefault();
    }

  });

  main.addEventListener('scroll', function() {

    var header = $('header');
    var headerTitles = header.querySelector('.header__title-wrapper');
    var scrollTopCapped = Math.min(70, main.scrollTop);
    var scaleString = 'scale(' + (1 - (scrollTopCapped / 300)) + ')';
    header.style.height = (156 - scrollTopCapped) + 'px';
    headerTitles.style.webkitTransform = scaleString;
    headerTitles.style.transform = scaleString;

    // Add a shadow to the header.
    if (main.scrollTop > 70)
      document.body.classList.add('raised');
    else
      document.body.classList.remove('raised');

    // Check if we need to load the next batch of stories.
    var loadThreshold = (main.scrollHeight - main.offsetHeight -
        LAZY_LOAD_THRESHOLD);
    if (main.scrollTop > loadThreshold) {
      loadStoryBatch();
    }
  });


  function loadStoryBatch() {

    if (storyLoadCount > 0)
      return;

    storyLoadCount = count;
    var scale = 1;
    var opcaity = 1;


    var end = storyStart + count;
    for (var i = storyStart; i < end; i++) {

      if (i >= stories.length)
        return;

      var key = String(stories[i]);

      APP.Data.getStoryById(stories[i], function(data){
        var story = document.createElement('div');
        var key = String(data.id);
        story.setAttribute('id', 's-' + key);
        var html    = storyTemplate(data);
        //console.log(html) ;
        data.time  *= 1000;
        story.innerHTML = html;

        main.appendChild(story);
        story.classList.add('story');
        story.addEventListener('click', onStoryClick.bind(this, data));
        story.classList.add('clickable') ;
        var id = 's-'+key;
        var score = document.getElementById(id).getElementsByClassName('story__score')[0];
        var title = document.getElementById(id).getElementsByClassName('story__title')[0];
        var scale = Math.min(1, Math.PI*score.innerHTML /100);
        var opacity = scale;
        score.style.width = (scale * 50) + 'px';
        score.style.height = (scale * 50) + 'px';
        score.style.lineHeight = (scale * 50) + 'px';
        title.style.opacity = opacity;
        storyLoadCount-- ;
      }) ;
    }
    storyStart += count;
  }

  // Bootstrap in the stories.
  APP.Data.getTopStories(function(data) {
    stories = data;
    loadStoryBatch();
    main.classList.remove('loading');
  });

})();
