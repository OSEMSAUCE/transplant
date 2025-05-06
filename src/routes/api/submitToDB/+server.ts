// http://localhost:5173/api/submitToDB
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { projects } from '$lib/server/db/schema';

const testData = 
{
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "properties": {
          "projectName": "Latur (Maharashtra)",
          "url": "https://restor.eco/sites/e4c3773f-3727-4bdc-944c-d2bbb13a4317/?interventionTypes=ACTIVE_RESTORATION|SUSTAINABLE_FORESTRY|RESTORING_NATURAL_DISTURBANCE_REGIMES|AGROFORESTRY|ASSISTED_NATURAL_REGENERATION",
          "hectares": "0.50",
          "organization_name": "",
          "orgUrlRestor": "",
          "activity": "Sustainable Land Management",
          "land_notes": "No description available",
          "error": "Missing orgUrlRestor"
        },
        "geometry": {
          "type": "MultiPolygon",
          "coordinates": [[[[76.59145856,18.08082383],[76.59143297,18.08004135],[76.59216227,18.08004541],[76.59217933,18.08019947],[76.59198314,18.08019542],[76.59200447,18.0807022],[76.59145856,18.08082383]]]]
        }
      },
      {
        "type": "Feature",
        "properties": {
          "projectName": "Sunnymount",
          "url": "https://restor.eco/sites/e6367c9e-adf2-4953-a94e-47779c60aad8/?interventionTypes=ACTIVE_RESTORATION|SUSTAINABLE_FORESTRY|RESTORING_NATURAL_DISTURBANCE_REGIMES|AGROFORESTRY|ASSISTED_NATURAL_REGENERATION",
          "hectares": "0.022",
          "organization_name": "",
          "orgUrlRestor": "",
          "activity": "Restoration",
          "land_notes": "No description available",
          "error": "Missing orgUrlRestor"
        },
        "geometry": {
          "type": "MultiPolygon",
          "coordinates": [[[[-1.26661139,51.46057554],[-1.2666257,51.46042848],[-1.2664147,51.46041511],[-1.26640575,51.46053432],[-1.26661139,51.46057554]]]]
        }
      },
    ]
}

export async function POST() {
    console.log('API: Submit to DB request received');
 
    const [projectData] = await db.insert(projects)
    .values([{
        // 6 May 2025 - we need to map the client side data to the db somehow. 
        // we data on the client for planting, crop, land.
        // we 

        projectName: testData.features[1].properties.projectName
    }])
    .returning();
 
    console.log(projectData);


    return json({ message: 'Submit to DB request received', projectData });
}


