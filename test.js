const tape = require('tape')
const Pager = require('./')
const crypto = require('crypto')

tape('get page', function (t) {
  const pages = new Pager(1024)

  const page = pages.get(0)

  t.same(page.offset, 0)
  t.same(page.buffer, Buffer.alloc(1024))
  t.end()
})

tape('get page twice', function (t) {
  const pages = new Pager(1024)
  t.same(pages.length, 0)

  const page = pages.get(0)

  t.same(page.offset, 0)
  t.same(page.buffer, Buffer.alloc(1024))
  t.same(pages.length, 1)

  const other = pages.get(0)

  t.same(other, page)
  t.end()
})

tape('get no mutable page', function (t) {
  const pages = new Pager(1024)

  t.ok(!pages.get(141, true))
  t.ok(pages.get(141))
  t.ok(pages.get(141, true))

  t.end()
})

tape('get far out page', function (t) {
  const pages = new Pager(1024)

  const page = pages.get(1000000)

  t.same(page.offset, 1000000 * 1024)
  t.same(page.buffer, Buffer.alloc(1024))
  t.same(pages.length, 1000000 + 1)

  const other = pages.get(1)

  t.same(other.offset, 1024)
  t.same(other.buffer, Buffer.alloc(1024))
  t.same(pages.length, 1000000 + 1)
  t.ok(other !== page)

  t.end()
})

tape('updates', function (t) {
  const pages = new Pager(1024)

  t.same(pages.lastUpdate(), null)

  const page = pages.get(10)

  page.buffer[42] = 1
  pages.updated(page)

  t.same(pages.lastUpdate(), page)
  t.same(pages.lastUpdate(), null)

  page.buffer[42] = 2
  pages.updated(page)
  pages.updated(page)

  t.same(pages.lastUpdate(), page)
  t.same(pages.lastUpdate(), null)

  t.end()
})

tape('turning pages into a combined buffer', function (t) {
  const pageSize = 10
  const max = 4
  const pages = new Pager(pageSize)
  const input = crypto.randomBytes(max * pageSize)
  const start = Math.pow(2, 16) - (max / 2)
  const end = start + max
  for (let i = 0, page = start; i < max; i++, page++) {
    pages.set(page, input.slice(i * pageSize, (i + 1) * pageSize))
  }
  const complete = pages.toBuffer()
  t.equals(complete.length, end * pageSize)
  t.ok(complete.slice(start * pageSize, end * pageSize).equals(input))
  t.end()
})

tape('get a far out page without allocation', function (t) {
  const pages = new Pager()
  t.equals(pages.get(Math.pow(2, 16), true), undefined)
  t.end()
})

tape('get a missing far out page without allocation', function (t) {
  const pages = new Pager(10)
  pages.set(Math.pow(2, 17), Buffer.alloc(1))
  t.equals(pages.get(Math.pow(2, 16), true), undefined)
  t.end()
})

tape('set a page', function (t) {
  const pages = new Pager(1024)

  let page = pages.get(10, true)
  t.equals(page, undefined)
  page = Buffer.alloc(1024)

  pages.set(8000, page)
  t.equals(pages.get(8000, true).buffer, page)

  t.end()
})

tape('set a page too small', function (t) {
  const pageSize = 10
  const pages = new Pager(pageSize)
  const random = crypto.randomBytes(5)
  pages.set(0, random)
  const page = pages.get(0)
  t.notEquals(page.buffer, random)
  t.equals(page.buffer.length, pageSize)
  t.ok(random.equals(page.buffer.slice(0, 5)))
  t.end()
})

tape('set a page too large', function (t) {
  const pageSize = 10
  const pages = new Pager(pageSize)
  const random = crypto.randomBytes(15)
  pages.set(0, random)
  const page = pages.get(0)
  t.notEquals(page.buffer, random)
  t.equals(page.buffer.length, pageSize)
  t.ok(page.buffer.equals(page.buffer.slice(0, 10)))
  t.end()
})

tape('re-setting a page', function (t) {
  const pageSize = 10
  const pages = new Pager(pageSize)
  const a = crypto.randomBytes(pageSize)
  const b = crypto.randomBytes(pageSize)
  pages.set(1, a)
  pages.set(1, b)
  t.equals(pages.get(1).buffer, b)
  t.end()
})

tape('deduplication', function (t) {
  const pageSize = 10
  const deduplicate = crypto.randomBytes(pageSize)
  const pages = new Pager(pageSize, { deduplicate: deduplicate })
  const copy = Buffer.allocUnsafe(pageSize)
  deduplicate.copy(copy)
  pages.set(0, copy)
  t.equals(pages.get(0, true).buffer, deduplicate)
  t.notEquals(pages.get(0).buffer, deduplicate)
  t.end()
})

tape('deduplication gets applied during update', function (t) {
  const pageSize = 10
  const deduplicate = crypto.randomBytes(pageSize)
  const pages = new Pager(pageSize, { deduplicate: deduplicate })
  const copy = Buffer.allocUnsafe(pageSize)
  deduplicate.copy(copy)
  copy[0] = (copy[0] + 1) % 0xff
  pages.set(0, copy)
  const page = pages.get(0, true)
  t.equals(page.buffer, copy)
  copy[0] = deduplicate[0]
  pages.updated(page)
  t.equals(page.buffer, deduplicate)
  t.end()
})

tape('zeros are removed if deduplication is given', function (t) {
  const pageSize = 10
  const deduplicate = crypto.randomBytes(pageSize)
  const pages = new Pager(pageSize, { deduplicate: deduplicate })
  const empty = Buffer.alloc(pageSize)
  pages.set(0, empty)
  t.equals(pages.get(0, true), undefined)
  t.end()
})
