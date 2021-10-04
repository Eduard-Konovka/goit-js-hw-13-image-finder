// --- Импорт стилей ---
import './sass/styles.css'

// --- Импорт настроек ---
import settingsURL from './js/settings'

// --- Импорт шаблона ---
import imageCardTpl from './templates/imageCardTpl.hbs'

// --- Импорт ссылок на DOM ---
import refs from './js/refs'

// --- Дефолтный экспорт объекта отвечающего за логику HTTP-запросов к API ---
import imagesApiService from './js/apiService'

// --- Дефолтный экспорт объекта-экземпляра класса отвечающего за логику HTTP-запросов к API ---
// import ImagesApiService from './js/apiServicePlagin'

// --- Дефолтный экспорт объекта-экземпляра класса кнопки загрузки следующей страницы ---
import LoadMoreBtn from './js/load-more-btn'

// --- Подключение плагина нотификации PNotify ---
import { alert, notice, info, success, error, defaultModules } from '@pnotify/core/dist/PNotify.js'
import * as PNotifyMobile from '@pnotify/mobile/dist/PNotifyMobile.js'
import '@pnotify/core/dist/PNotify.css'
import '@pnotify/core/dist/BrightTheme.css'
defaultModules.set(PNotifyMobile, {})

// --- Настройка плагина нотификации PNotify ---
import { defaults } from '@pnotify/core'
defaults.width = '400px'
defaults.delay = '3000'

// --- Подключение плагина debounce ---
const debounce = require('lodash.debounce')

// --- Подключение плагина лайтбокса basicLightbox ---
import 'basiclightbox/dist/basicLightbox.min.css'
import * as basicLightbox from 'basiclightbox'
// const basicLightbox = require('basiclightbox')
// import { create } from 'basiclightbox'

// --- Создание объекта-экземпляра класса отвечающего за логику HTTP-запросов к API ---
// const imagesApiService = new ImagesApiService()

// --- Создание объекта-экземпляра класса кнопки загрузки следующей страницы ---
export const loadMoreBtn = new LoadMoreBtn({
  selector: '[data-action="load-more"]',
  hidden: true,
})

// --- Слушатели событий ---
refs.searchForm.addEventListener('input', debounce(onSearch, 1000))
loadMoreBtn.refs.button.addEventListener('click', onLoadMore)

// --- Функции рендеринга лайтбокса basicLightbox ---
function getLargerImageLink(targetImage) {
  const instance = basicLightbox.create(`
    <img src="${targetImage.dataset.url}" alt="${targetImage.alt}">
  `)
  instance.show()
}

const updateBasicLightbox = {
  handleNavClick(e) {
    e.preventDefault()

    const target = e.target

    if (target.nodeName !== 'IMG') return

    getLargerImageLink(target)
  },

  create() {
    refs.imagesContainer.addEventListener('click', this.handleNavClick)
  },

  remove() {
    refs.imagesContainer.removeEventListener('click', this.handleNavClick)
  },
}

// --- Функции рендеринга изображений ---

export function onSearch(e) {
  refs.imagesContainer.innerHTML = ''
  imagesApiService.resetPage()
  imagesApiService.query = e.target.value.trim()

  if (imagesApiService.searchQuery.length < 1) {
    refs.imagesContainer.innerHTML = ''
    e.target.value = ''
    info({ text: 'Too many matches found. Please enter a more specific query!' })
    e.target.value = ''
    return
  }

  loadMoreBtn.show()
  loadMoreBtn.disable()
  imagesApiService
    .fetchArticles()
    .then(checksNumberOfImages)
    .then(checksQuantityOnPage)
    .then(createGalleryImages)
    .then(updateBasicLightbox.create())
    .catch(onFetchError)
  e.target.value = ''
}

export function onLoadMore(e) {
  imagesApiService.incrementPage()
  loadMoreBtn.disable()
  imagesApiService
    .fetchArticles()
    .then(updateBasicLightbox.remove())
    .then(checksQuantityOnTotalHits)
    .then(createGalleryImages)
    .then(updateBasicLightbox.create())
    .catch(onFetchError)
}

function checksNumberOfImages(images) {
  if (images.total === 0) {
    refs.imagesContainer.innerHTML = ''
    throw 'Check the correctness of the entered data, images of this category do not exist!'
  }

  return images
}

function checksQuantityOnPage(images) {
  if (images.hits.length === settingsURL.QUANTITY_PER_PAGE) {
    return images
  }

  refs.imagesContainer.insertAdjacentHTML('beforeend', imageCardTpl(images))
  loadMoreBtn.hide()
  throw 'Upload successful!'
}

function checksQuantityOnTotalHits(images) {
  const totalHits = settingsURL.QUANTITY_PER_PAGE * Math.floor(images.totalHits / settingsURL.QUANTITY_PER_PAGE)
  if (refs.imagesContainer.children.length < totalHits) {
    return images
  }

  refs.imagesContainer.insertAdjacentHTML('beforeend', imageCardTpl(images))
  throw 'No more images!'
}

function createGalleryImages(images) {
  refs.imagesContainer.insertAdjacentHTML('beforeend', imageCardTpl(images))
  loadMoreBtn.enable()
  loadMoreBtn.refs.button.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
  })
}

function onFetchError(message) {
  loadMoreBtn.hide()

  if (message === 'Check the correctness of the entered data, images of this category do not exist!') {
    alert({ text: message })
  } else if (message === 'No more images!') {
    notice({ text: message })
  } else if (message === 'Upload successful!') {
    success({ text: message })
  } else {
    error({ text: 'Server error \n Please try again later' })
  }
}
