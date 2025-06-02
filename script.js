/* globals d3 */

(function hoverzoom() {
  const svg = d3.select(".treemap");
  d3.selectAll("image")
    .on("mouseenter", function () {
      const node = d3.select(this);
      node.attr({
        "data-w": node.attr("width"),
        "data-h": node.attr("height"),
      });
      node.attr({ width: 200, height: 300 });
      svg.append(function () {
        return node.remove().node();
      });
    })
    .on("mouseleave", function () {
      const node = d3.select(this);
      node.attr({
        width: node.attr("data-w"),
        height: node.attr("data-h"),
      });
    });
})();

var raw_data,
  width = 1600,
  height = 800,
  xCells = 100,
  yCells = 50,
  grid = d3
    .select(".grid")
    .attr("width", width + 30)
    .attr("height", height + 30)
    .attr("viewBox", `0 0 ${width + 30} ${height + 30}`)
    .attr("preserveAspectRatio", "xMidYMin"),
  xscale = d3.scale.linear().range([0, width]).domain([0, xCells]),
  yscale = d3.scale.linear().range([0, height]).domain([0, yCells]),
  ratingscale = d3.scale.linear().domain([1, 10]).range([yCells, 0]),
  votescale = d3.scale.log().domain([10000, 3000000]).range([0, xCells]),
  genres =
    " Action Adventure Animation Biography Comedy Crime Documentary Drama Family Fantasy History Horror Music Musical Mystery Romance Sci-Fi Sport Thriller War Western".split(
      / /
    ),
  types = " movie series".split(/ /),
  decades = " 2020s 2010s 2000s 1990s 1980s 1970s 1960s 1950s 1940s 1930s".split(/ /);

const info = await fetch("info.json").then((r) => r.json());
document.querySelector("#updated").setAttribute("datetime", info.updated);
document.querySelector("#updated").textContent = d3.time.format("%d %b %Y")(new Date(info.updated));

d3.csv("movies.csv", function (data) {
  // Add filters
  raw_data = data;
  d3.select("#Genre").selectAll("option").data(genres).enter().append("option").text(String);
  d3.select("#Type").selectAll("option").data(types).enter().append("option").text(String);
  d3.select("#Year")
    .selectAll("option")
    .data(decades)
    .enter()
    .append("option")
    .text(String)
    .property("value", (d) => (d ? "^" + d.slice(0, 3) : ""));

  function set_hash() {
    var genre = d3.select("#Genre").property("value"),
      type = d3.select("#Type").property("value"),
      decade = d3.select("#Year").property("value"),
      title = d3.select("#Title").property("value").replace(/^ */, "").replace(/ *$/, ""),
      hashes = [];
    if (genre) hashes.push("Genre=" + encodeURIComponent(genre));
    if (type) hashes.push("Type=" + encodeURIComponent(type));
    if (decade) hashes.push("Year=" + encodeURIComponent(decade));
    if (title) hashes.push("Title=" + encodeURIComponent(title));
    window.location.hash = hashes.join("&");
  }

  d3.selectAll("#Genre, #Type, #Year").on("change", set_hash);
  d3.selectAll("#Title").on("keyup", set_hash);
  d3.select(window).on("hashchange", draw).on("hashchange")();

  // Add legend
  var ratingformat = d3.format(".1f");
  var rating = grid
    .selectAll(".rating")
    .data(d3.range(2, 10))
    .enter()
    .append("g")
    .classed("rating", true)
    .attr("transform", (d) => `translate(0,${yscale(ratingscale(d))})`);
  rating
    .append("text")
    .attr("x", width + 25)
    .attr("text-anchor", "end")
    .attr("dy", ".35em")
    .text(ratingformat);
  rating.append("path").attr("d", `M0,0h${width}`);

  var voteformat = d3.format(".0f");
  var vote = grid
    .selectAll(".vote")
    .data([10000, 20000, 50000, 100000, 200000, 500000, 1000000, 2000000])
    .enter()
    .append("g")
    .classed("vote", true)
    .attr("transform", (d) => `translate(${xscale(votescale(d))},0)`);
  vote
    .append("text")
    .attr("y", 0)
    .attr("dy", "1em")
    .attr("text-anchor", (d) => (d == 10000 ? "start" : "middle"))
    .text((d) => voteformat(d / 1000) + "K");
  vote.append("path").attr("d", `M0,0v${height}`);

  grid
    .append("text")
    .text("Rating")
    .attr({ x: width + 25, dy: "2.5em", "text-anchor": "end" });
  grid.append("text").text("Votes").attr({ x: width, y: 0, dy: "1em", "text-anchor": "end" });
});

function draw(filter) {
  var data = raw_data;

  if (typeof filter == "function") {
    data = data.filter(filter);
  } else {
    var hashes = window.location.hash.replace(/^#/, "").split("&");
    hashes.forEach(function (hash) {
      var parts = hash.split(/=/),
        key = parts[0],
        value = decodeURIComponent(parts.slice(1).join("="));
      if (key && value) {
        d3.select("#" + key).property("value", value);
        data = data.filter((d) => d[key].match(new RegExp(value, "i")));
      }
    });
  }

  grid.selectAll(".cell, .brush").remove();
  var table = d3.select(".table");

  var i = data.length;
  if (i == 0) {
    return;
  }
  var row,
    cell = {},
    max = 0;
  while (i--) {
    row = data[i];
    row["Votes"] = +row["Votes"];
    var y = Math.round(ratingscale(row["Rating"])),
      x = Math.round(votescale(row["Votes"])),
      key = x + "," + y,
      list = cell[key] || (cell[key] = []);
    list.push(row);
    var len = list.length;
    if (len > max) {
      max = len;
    }
  }

  function count(key, genre) {
    if (typeof genre == "undefined") {
      return cell[key].length;
    } else {
      var count = 0,
        list = cell[key],
        i = list.length;
      while (--i) {
        if (list[i].Genre.match(genre)) {
          count += 1;
        }
      }
      return count;
    }
  }

  var opacity = d3.scale.pow().exponent(0.8).domain([0, max]).range([0.05, 1]).clamp(true);
  var cells = grid
    .selectAll(".cell")
    .data(
      d3.keys(cell).map(function (d) {
        var xy = d.split(",");
        return { x: +xy[0], y: +xy[1], key: d };
      })
    )
    .enter()
    .append("rect")
    .classed("cell", true)
    .attr("x", (d) => (width / xCells) * d.x)
    .attr("y", (d) => (height / yCells) * d.y)
    .attr("fill-opacity", (d) => opacity(count(d.key)))
    .attr("width", width / xCells)
    .attr("height", height / yCells);

  function show_table(data) {
    table.selectAll("tbody *").remove();
    if (!data || data.length == 0) {
      table.style("display", "none");
      return;
    } else {
      table.style("display", "block");
    }
    var MAX = 30;
    var rows = table
      .select("tbody")
      .selectAll(".movie")
      .data(data.slice(0, MAX))
      .enter()
      .append("tr")
      .classed("movie", true);
    rows
      .append("td")
      .append("a")
      .attr("href", (d) => `http://www.imdb.com/title/${d.ID}/`)
      .attr("target", "_blank")
      .text((d) => d.Title);
    rows.append("td").text((d) => comma(d.Votes));
    rows.append("td").text((d) => d.Rating);
    if (data.length > MAX) {
      table
        .select("tbody")
        .append("tr")
        .append("td")
        .text("... " + (data.length - MAX) + " more");
    }
    var brush = d3.select(".brush .extent").node().getBoundingClientRect(),
      gridrect = grid.node().getBoundingClientRect(),
      left,
      top;
    if (d3.event.type == "mousemove") {
      var pos = d3.mouse(mainnode);
      left = pos[0] - 100;
      top = pos[1] + 25;
    } else {
      left = brush.left - gridrect.left;
      top = brush.top + brush.height + 10;
    }
    table.style({
      left: left + "px",
      top: top + "px",
    });
  }

  var comma = d3.format(",d"),
    mainnode = d3.select(".main").node(),
    brushcount = 0;
  grid
    .append("g")
    .classed("brush", true)
    .call(
      d3.svg
        .brush()
        .x(xscale)
        .y(xscale)
        .on("brush", function () {
          var extent = d3.event.target.extent();
          brushcount = 0;
          cells.classed("active", function (d) {
            d.active = extent[0][0] <= d.x + 1 && d.x <= extent[1][0] && extent[0][1] <= d.y + 1 && d.y <= extent[1][1];
            if (d.active) {
              brushcount++;
            }
            return d.active;
          });
        })
        .on("brushend", function () {
          var nodes = cells.filter((d) => d.active).data();
          var groups = nodes.map((node) => cell[node.key]);
          var data = [];
          data = data.concat.apply(data, groups);
          data.sort((a, b) => (a.Votes < b.Votes ? +1 : a.Votes > b.Votes ? -1 : 0));
          show_table(data);
        })
    );
  var lastkey;
  grid.on("mousemove", function () {
    if (brushcount > 0) {
      return;
    }
    var gridpos = d3.mouse(d3.select(".grid").node()),
      x = Math.floor(xscale.invert(gridpos[0])),
      y = Math.floor(xscale.invert(gridpos[1])),
      key = x + "," + y;
    if (key == lastkey) return;
    lastkey = key;

    cells.classed("active", (d) => x == d.x && y == d.y);
    var data = cell[key];
    if (data) data.sort((a, b) => (a.Votes < b.Votes ? +1 : a.Votes > b.Votes ? -1 : 0));
    show_table(data);
  });
}
