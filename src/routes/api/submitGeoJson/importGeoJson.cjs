// importGeoJson.js - Entity-level GeoJSON import script
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Initialize Prisma client
const prisma = new PrismaClient();

// Define paths
const geoJsonPath = path.join(process.cwd(), 'src/routes/api/submitGeoJson/commonFormat.geojson');
const statusFilePath = path.join(
	process.cwd(),
	'src/routes/api/submitGeoJson/lastSubmitStatus.json'
);

/**
 * Get a more descriptive error message from Prisma errors
 */
function getPrismaErrorDetails(error) {
	// Check if it's a Prisma error with a code
	if (error.code) {
		switch (error.code) {
			case 'P2002': // Unique constraint failed
				return `Duplicate entry: ${error.meta?.target?.join(', ') || 'unknown field'}`;
			case 'P2003': // Foreign key constraint failed
				return `Foreign key constraint failed: ${error.meta?.field_name || 'unknown field'}`;
			case 'P2025': // Record not found
				return 'Related record not found';
			default:
				return error.message;
		}
	}
	return error.message;
}

/**
 * Import GeoJSON data into the database
 */
async function importGeoJson() {
	// Entity-level summary object
	const entitySummary = {};

	try {
		// Read and parse GeoJSON file
		if (!fs.existsSync(geoJsonPath)) {
			throw new Error(`GeoJSON file not found: ${geoJsonPath}`);
		}

		const geoJsonData = JSON.parse(fs.readFileSync(geoJsonPath, 'utf8'));

		// Process organizations
		if (geoJsonData.organizations && Array.isArray(geoJsonData.organizations)) {
			let orgCount = 0,
				orgFail = 0,
				orgDuplicate = 0;
			let orgReason = '';

			for (const org of geoJsonData.organizations) {
				orgCount++;
				let orgOk = true;

				try {
					// Check if organization exists
					let organization = await prisma.organizations.findFirst({
						where: { organizationName: org.organizationName }
					});

					// Create organization if it doesn't exist
					if (!organization) {
						organization = await prisma.organizations.create({
							data: {
								organizationName: org.organizationName,
								contactName: org.ContactName,
								contactEmail: org.ContactEmail,
								website: org.website,
								organizationNotes: org.organizationNotes
							}
						});
					} else {
						// Organization already exists - count as duplicate but don't fail
						orgDuplicate++;
					}
				} catch (e) {
					orgFail++;
					orgReason = getPrismaErrorDetails(e);
					orgOk = false;
				}

				// Process projects
				if (org.projects && Array.isArray(org.projects)) {
					let projectCount = 0,
						projectFail = 0,
						projectDuplicate = 0;
					let projectReason = '';

					for (const proj of org.projects) {
						projectCount++;
						let projectOk = orgOk;
						let projectObj = null;

						if (orgOk) {
							try {
								// Check if project exists first
								projectObj = await prisma.projects.findFirst({
									where: { projectName: proj.projectName }
								});

								if (!projectObj) {
									projectObj = await prisma.projects.create({
										data: {
											projectName: proj.projectName,
											projectNotes: proj.projectNotes
										}
									});
								} else {
									// Project already exists - count as duplicate but don't fail
									projectDuplicate++;
								}
							} catch (e) {
								projectFail++;
								projectReason = getPrismaErrorDetails(e);
								projectOk = false;
							}
						} else {
							projectFail++;
							projectReason = 'Not attempted because organization creation failed';
							projectOk = false;
						}

						// Process lands
						if (proj.lands && Array.isArray(proj.lands)) {
							let landCount = 0,
								landFail = 0,
								landDuplicate = 0,
								polygonCount = 0;
							let landReason = '';

							for (const landItem of proj.lands) {
								landCount++;
								let landOk = projectOk;
								let landObj = null;

								if (projectOk) {
									try {
										// TEMPORARILY SKIP duplicate check to show actual errors
										landObj = await prisma.land.create({
											data: {
												landName: landItem.landName,
												hectares: landItem.hectares,
												landHolder: landItem.landHolder,
												polygon: JSON.stringify(landItem.polygon),
												gpsLat: landItem.gpsLat,
												gpsLon: landItem.gpsLon,
												landNotes: landItem.landNotes
											}
										});
									} catch (e) {
										landFail++;
										landReason = getPrismaErrorDetails(e);
										landOk = false;
									}
								} else {
									landFail++;
									landReason = 'Not attempted because project creation failed';
									landOk = false;
								}

								// Process polygon
								polygonCount++;
								if (landOk && landItem.geojson) {
									try {
										// Use the land object we either found or created
										if (landObj) {
											// Check if polygon already exists
											const existingPolygon = await prisma.polygons.findFirst({
												where: { landId: landObj.landId }
											});

											if (!existingPolygon) {
												await prisma.polygons.create({
													data: {
														geojson: JSON.stringify(landItem.geojson),
														landId: landObj.landId,
														landName: landItem.landName
													}
												});
											}
										}
									} catch (e) {
										// For this entity-level summary, we don't track polygon failures separately
									}
								}
							}

							// Add land summary if there were failures or duplicates
							if (landFail > 0 || landDuplicate > 0) {
								// Track specific errors for lands
								if (!entitySummary['land']) {
									// Extract a concise reason for the summary
									let conciseReason =
										landReason ||
										(landDuplicate > 0 ? 'Some land entries already exist in the database' : '');

									// Make the reason more concise for the top-level display
									if (conciseReason.includes('Argument `landName` is missing')) {
										conciseReason = 'Missing required field: landName';
									} else if (conciseReason.includes('Unique constraint failed')) {
										conciseReason = 'Duplicate entry: landName';
									}

									entitySummary['land'] = {
										failCount: landFail,
										duplicateCount: landDuplicate,
										reason: conciseReason,
										errors: [] // Array to store specific errors
									};
								}

								// Add specific error details if there were failures
								if (landFail > 0 && landReason) {
									// Extract just the error type from the full error message
									let errorType = 'Unknown error';

									if (landReason.includes('Argument `landName` is missing')) {
										errorType = 'Missing required field: landName';
									} else if (landReason.includes('Unique constraint failed')) {
										errorType = 'Duplicate entry: landName';
									} else {
										// Try to extract just the last line which often contains the core error
										const lastLine = landReason
											.split('\n')
											.filter((line) => line.trim())
											.pop();
										if (lastLine) {
											errorType = lastLine.trim();
										}
									}

									// Only add the error if it's not already in the list
									const errorExists = entitySummary['land'].errors.some(
										(e) => e.error === errorType
									);
									if (!errorExists) {
										entitySummary['land'].errors.push({
											error: errorType
										});
									}
								}

								// If all lands failed, add polygon skipped info
								if (landFail === landCount) {
									entitySummary['polygon'] = {
										skippedCount: polygonCount,
										reason: 'Not attempted because land creation failed'
									};
								}
							}
						}
					}

					// Add project summary if there were failures or duplicates
					if (projectFail > 0 || projectDuplicate > 0) {
						if (!entitySummary['project']) {
							// Extract a concise reason for the summary
							let conciseReason =
								projectReason ||
								(projectDuplicate > 0 ? 'Some project entries already exist in the database' : '');

							// Make the reason more concise for the top-level display
							if (conciseReason.includes('Argument `projectName` is missing')) {
								conciseReason = 'Missing required field: projectName';
							} else if (conciseReason.includes('Unique constraint failed')) {
								conciseReason = 'Duplicate entry: projectName';
							}

							entitySummary['project'] = {
								failCount: projectFail,
								duplicateCount: projectDuplicate,
								reason: conciseReason,
								errors: [] // Array to store specific errors
							};
						} else {
							// Update counts
							entitySummary['project'].failCount += projectFail;
							entitySummary['project'].duplicateCount += projectDuplicate;
						}

						// Add specific error details if there were failures
						if (projectFail > 0 && projectReason) {
							// Extract just the error type from the full error message
							let errorType = 'Unknown error';

							if (projectReason.includes('Argument `projectName` is missing')) {
								errorType = 'Missing required field: projectName';
							} else if (projectReason.includes('Unique constraint failed')) {
								errorType = 'Duplicate entry: projectName';
							} else {
								// Try to extract just the last line which often contains the core error
								const lastLine = projectReason
									.split('\n')
									.filter((line) => line.trim())
									.pop();
								if (lastLine) {
									errorType = lastLine.trim();
								}
							}

							// Only add the error if it's not already in the list
							const errorExists = entitySummary['project'].errors.some(
								(e) => e.error === errorType
							);
							if (!errorExists) {
								entitySummary['project'].errors.push({
									error: errorType
								});
							}
						}
					}
				}
			}

			// Add organization summary if there were failures or duplicates
			if (orgFail > 0 || orgDuplicate > 0) {
				// Extract a concise reason for the summary
				let conciseReason =
					orgReason ||
					(orgDuplicate > 0 ? 'Some organization entries already exist in the database' : '');

				// Make the reason more concise for the top-level display
				if (conciseReason.includes('Argument `organizationName` is missing')) {
					conciseReason = 'Missing required field: organizationName';
				} else if (conciseReason.includes('Unique constraint failed')) {
					conciseReason = 'Duplicate entry: organizationName';
				}

				entitySummary['organization'] = {
					failCount: orgFail,
					duplicateCount: orgDuplicate,
					reason: conciseReason,
					errors: [] // Array to store specific errors
				};

				// Add specific error details if there were failures
				if (orgFail > 0 && orgReason) {
					// Extract just the error type from the full error message
					let errorType = 'Unknown error';

					if (orgReason.includes('Argument `organizationName` is missing')) {
						errorType = 'Missing required field: organizationName';
					} else if (orgReason.includes('Unique constraint failed')) {
						errorType = 'Duplicate entry: organizationName';
					} else {
						// Try to extract just the last line which often contains the core error
						const lastLine = orgReason
							.split('\n')
							.filter((line) => line.trim())
							.pop();
						if (lastLine) {
							errorType = lastLine.trim();
						}
					}

					// Only add the error if it's not already in the list
					const errorExists = entitySummary['organization'].errors.some(
						(e) => e.error === errorType
					);
					if (!errorExists) {
						entitySummary['organization'].errors.push({
							error: errorType
						});
					}
				}
			}
		} else {
			throw new Error('Invalid GeoJSON format: missing organizations array');
		}

		// Write summary to file
		if (Object.keys(entitySummary).length > 0) {
			fs.writeFileSync(statusFilePath, JSON.stringify(entitySummary, null, 2), 'utf8');
			console.log('Entity-level summary written to', statusFilePath);
		} else {
			fs.writeFileSync(
				statusFilePath,
				JSON.stringify(
					{
						status: 'success',
						message: 'All records submitted successfully.'
					},
					null,
					2
				),
				'utf8'
			);
			console.log('Success summary written to', statusFilePath);
		}
	} catch (error) {
		console.error('Error importing GeoJSON:', error.message);

		// Write error summary even if the process failed early
		fs.writeFileSync(
			statusFilePath,
			JSON.stringify(
				{
					error: {
						message: error.message
					}
				},
				null,
				2
			),
			'utf8'
		);
	} finally {
		await prisma.$disconnect();
	}
}
// Run the import function
importGeoJson().catch((e) => {
	console.error('Unhandled error:', e);
	process.exit(1);
});
