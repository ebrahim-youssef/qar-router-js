import { queryCatalog, type CatalogQuery } from './query.js'
export const getReciters = (query?: CatalogQuery) => queryCatalog(query).reciters
export const getRiwayat = (query?: CatalogQuery) => queryCatalog(query).riwayat
export const getStyles = (query?: CatalogQuery) => queryCatalog(query).styles
