import { Icon } from "./icons";
import "./DiscountsPage.css";

export default function DiscountsPage() {
  return (
    <div className="discounts-page">
      <div className="discounts-heading"><span className="discounts-icon"><Icon.tag /></span><div><h1>Discounts</h1><p>Manage approved tuition discounts for your institution.</p></div></div>
      <section className="discounts-empty">
        <h2>Discounts are not available yet</h2>
        <p>The current backend contract has no discount endpoint or discount data model. This page will be connected when those endpoints are added.</p>
      </section>
    </div>
  );
}