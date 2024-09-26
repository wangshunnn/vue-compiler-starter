import { cached } from 'vue2/utils'

export const parseStyleText = cached(function (cssText) {
  const res: any = {}
  const listDelimiter = /;(?![^(]*\))/g
  const propertyDelimiter = /:(.+)/
  cssText.split(listDelimiter).forEach(function (item) {
    if (item) {
      const tmp: any[] = item.split(propertyDelimiter)
      if (tmp.length > 1) {
        res[tmp[0].trim()] = tmp[1].trim()
      }
    }
  })
  return res
})
