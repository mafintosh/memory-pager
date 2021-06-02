const tape = require('tape')
const Pager = require('./')

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
